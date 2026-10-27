const { checkAudit } = require('../../scripts/check-audit');

const advisory = (id, severity, moduleName = 'left-pad') =>
  JSON.stringify({
    type: 'auditAdvisory',
    data: {
      advisory: {
        github_advisory_id: id,
        severity,
        module_name: moduleName,
        title: `${moduleName} problem`,
        url: `https://github.com/advisories/${id}`,
        patched_versions: '>=2.0.0',
      },
    },
  });

const summary = JSON.stringify({
  type: 'auditSummary',
  data: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0 } },
});

const ndjson = (...lines) => lines.join('\n') + '\n';
const REASON = 'left-pad: affects the server runtime; not in a static export; fixed only in left-pad >=2.0.0';

describe('checkAudit', () => {
  it('reports a high advisory that is not allowlisted', () => {
    const r = checkAudit(ndjson(advisory('GHSA-aaaa-bbbb-cccc', 'high'), summary), {});
    expect(r.complete).toBe(true);
    expect(r.violations).toEqual([
      { id: 'GHSA-aaaa-bbbb-cccc', severity: 'high', module: 'left-pad', title: 'left-pad problem' },
    ]);
  });

  it('passes an allowlisted advisory and reports no unused entry', () => {
    const r = checkAudit(ndjson(advisory('GHSA-aaaa-bbbb-cccc', 'high'), summary), {
      'GHSA-aaaa-bbbb-cccc': REASON,
    });
    expect(r.violations).toEqual([]);
    expect(r.badEntries).toEqual([]);
    expect(r.unused).toEqual([]);
  });

  it('counts critical like high and ignores moderate and low', () => {
    const r = checkAudit(
      ndjson(
        advisory('GHSA-aaaa-bbbb-cccc', 'critical'),
        advisory('GHSA-dddd-eeee-ffff', 'moderate'),
        advisory('GHSA-gggg-hhhh-iiii', 'low'),
        summary
      ),
      {}
    );
    expect(r.violations.map((v) => v.id)).toEqual(['GHSA-aaaa-bbbb-cccc']);
  });

  it('counts the same advisory seen on several paths once', () => {
    const r = checkAudit(
      ndjson(advisory('GHSA-aaaa-bbbb-cccc', 'high'), advisory('GHSA-aaaa-bbbb-cccc', 'high'), summary),
      {}
    );
    expect(r.violations).toHaveLength(1);
  });

  it('rejects an empty reason and a key that is not a GHSA id, and does not honour them', () => {
    const r = checkAudit(ndjson(advisory('GHSA-aaaa-bbbb-cccc', 'high'), summary), {
      'GHSA-aaaa-bbbb-cccc': '   ',
      'CVE-2020-1234': REASON,
    });
    expect(r.badEntries.map((b) => b.id).sort()).toEqual(['CVE-2020-1234', 'GHSA-aaaa-bbbb-cccc']);
    expect(r.violations).toHaveLength(1);
  });

  it('fails closed when there is no auditSummary line', () => {
    const r = checkAudit(ndjson(advisory('GHSA-aaaa-bbbb-cccc', 'high')), {});
    expect(r.complete).toBe(false);
  });
});
