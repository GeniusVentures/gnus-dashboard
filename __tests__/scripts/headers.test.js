const fs = require("fs");
const os = require("os");
const path = require("path");
const headers = require("../../scripts/headers");

const { policy, headersFile, headersFor, cspName, unlistedHosts, main, UNUSED_HOSTS } = headers;

describe("out/_headers", () => {
  const block = (text, selector) => {
    const start = text.indexOf(`${selector}\n`);
    const rest = text.slice(start + selector.length + 1);
    return rest.split(/\n(?=\S)/)[0];
  };

  test("the /* block holds every security header and no Cache-Control", () => {
    const all = block(headersFile(false), "/*");
    for (const name of [
      "Content-Security-Policy-Report-Only",
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "X-Frame-Options",
      "Permissions-Policy",
      "Cross-Origin-Opener-Policy",
    ]) {
      expect(all).toContain(`  ${name}: `);
    }
    expect(all).not.toMatch(/Cache-Control/i);
  });

  test("the /_next/static/* block's only header is the immutable Cache-Control", () => {
    const text = block(headersFile(false), "/_next/static/*").trim().split("\n");
    expect(text.map((line) => line.trim())).toEqual(["Cache-Control: public, max-age=31536000, immutable"]);
  });
});

describe("the policy", () => {
  test("report-only names the report-only header and enforced the real one, with the same text", () => {
    expect(cspName(false)).toBe("Content-Security-Policy-Report-Only");
    expect(cspName(true)).toBe("Content-Security-Policy");
    expect(headersFile(false)).toContain(`Content-Security-Policy-Report-Only: ${policy}`);
    const enforced = headersFile(true);
    expect(enforced).toContain(`  Content-Security-Policy: ${policy}`);
    expect(enforced).not.toContain("Report-Only");
  });

  test("scripts come from the origin alone", () => {
    expect(policy.match(/script-src[^;]*/)[0]).toBe("script-src 'self'");
    expect(policy).not.toMatch(/unsafe-(inline|eval)/);
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  test("the relay is the only outside connection and Verify the only outside frame", () => {
    expect(policy.match(/connect-src[^;]*/)[0]).toBe("connect-src 'self' wss://relay.walletconnect.org");
    expect(policy.match(/frame-src[^;]*/)[0]).toBe("frame-src https://verify.walletconnect.org");
  });
});

describe("headersFor", () => {
  test("static files are immutable, HTML revalidates, other files carry no cache header", () => {
    const get = (list, name) => list.find(([n]) => n === name)?.[1];
    expect(get(headersFor("/_next/static/chunks/a.js"), "Cache-Control")).toMatch(/immutable/);
    expect(get(headersFor("/jobs", { html: true }), "Cache-Control")).toBe("no-cache");
    expect(get(headersFor("/favicon.ico"), "Cache-Control")).toBeUndefined();
  });
});

describe("the chunk host check", () => {
  const plant = (text) => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "gnus-headers-"));
    const chunks = path.join(out, "_next", "static", "chunks");
    fs.mkdirSync(chunks, { recursive: true });
    fs.writeFileSync(path.join(chunks, "a.js"), text);
    return out;
  };

  test("a host the policy allows or names as unused passes", () => {
    const out = plant(
      `"wss://relay.walletconnect.org";"https://verify.walletconnect.org/v3";"https://pulse.walletconnect.org"`,
    );
    expect(unlistedHosts(path.join(out, "_next", "static", "chunks"))).toEqual([]);
  });

  test("an unlisted host fails the writer, names the host, and writes nothing", () => {
    const out = plant(`fetch("https://telemetry.reown.com/x")`);
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(main(out)).toBe(1);
    expect(spy.mock.calls.join(" ")).toContain("telemetry.reown.com");
    expect(fs.existsSync(path.join(out, "_headers"))).toBe(false);
  });

  test("a clean export gets its _headers file", () => {
    const out = plant(`"wss://relay.walletconnect.org"`);
    jest.spyOn(console, "log").mockImplementation(() => {});
    expect(main(out)).toBe(0);
    expect(fs.readFileSync(path.join(out, "_headers"), "utf8")).toBe(headersFile());
  });

  test("a missing out/ fails", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(main(path.join(os.tmpdir(), "gnus-no-such-out"))).toBe(1);
  });

  test("every unused host has a reason", () => {
    for (const [host, reason] of Object.entries(UNUSED_HOSTS)) {
      expect(reason.length).toBeGreaterThan(10);
      expect(host).toMatch(/\.(walletconnect|reown)\./);
    }
  });

  const built = path.join(__dirname, "..", "..", "out", "_next", "static", "chunks");
  (fs.existsSync(built) ? test : test.skip)("the real build names no unlisted host", () => {
    expect(unlistedHosts(built)).toEqual([]);
  });
});
