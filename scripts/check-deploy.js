// Checks a served export (the local server, a preview or production) against the headers module.
// Usage: node scripts/check-deploy.js <baseUrl>. Exit 0 when every check holds, 1 with the problems listed.
"use strict";
const { CSP_ENFORCED, cspName, securityHeaders } = require("./headers");

const DETAIL_HASH = "0x" + "ab".repeat(32);
const ROUTES = ["/", "/submit", "/jobs", `/jobs/detail?hash=${DETAIL_HASH}`, "/earnings"];
const NOT_FOUND_TEXT = "Page not found";

const header = (res, name) => res.headers.get(name);

/** What is wrong with the headers of one HTML response, as plain sentences. */
function headerProblems(label, res, enforced) {
  const problems = [];
  const other = cspName(!enforced);
  if (header(res, other) !== null) {
    problems.push(`${label}: sends ${other}, expected only ${cspName(enforced)}`);
  }
  for (const [name, value] of securityHeaders(enforced)) {
    const got = header(res, name);
    if (got !== value) {
      problems.push(`${label}: ${name} is ${got === null ? "missing" : `"${got}"`}, expected "${value}"`);
    }
  }
  const cache = header(res, "cache-control") ?? "";
  if (/immutable/i.test(cache) || !/no-cache|max-age=0/i.test(cache)) {
    problems.push(`${label}: HTML Cache-Control is "${cache}", expected no-cache or max-age=0 and never immutable`);
  }
  return problems;
}

async function checkDeploy(base, { enforced = CSP_ENFORCED, fetchImpl = fetch } = {}) {
  const problems = [];
  const get = (path) => fetchImpl(new URL(path, base), { redirect: "manual" });
  let home = "";
  for (const route of ROUTES) {
    const res = await get(route);
    const text = await res.text();
    if (route === "/") {
      home = text;
    }
    if (res.status !== 200) {
      problems.push(`${route}: status ${res.status}, expected 200`);
      continue;
    }
    if (!/text\/html/i.test(header(res, "content-type") ?? "")) {
      problems.push(`${route}: content-type is ${header(res, "content-type")}, expected HTML`);
    }
    problems.push(...headerProblems(route, res, enforced));
  }
  const missing = await get("/no-such-page");
  const missingText = await missing.text();
  if (missing.status !== 404) {
    problems.push(`/no-such-page: status ${missing.status}, expected 404`);
  } else {
    if (!missingText.includes(NOT_FOUND_TEXT)) {
      problems.push(`/no-such-page: the body is not the 404 page ("${NOT_FOUND_TEXT}" is missing)`);
    }
    problems.push(...headerProblems("/no-such-page", missing, enforced));
  }
  const asset = /\/_next\/static\/[^"'\s]+\.(?:js|css)/.exec(home)?.[0];
  if (!asset) {
    problems.push("/: names no /_next/static/ file to check the cache header on");
  } else {
    const res = await get(asset);
    const cache = header(res, "cache-control") ?? "";
    if (res.status !== 200 || !/immutable/i.test(cache)) {
      problems.push(`${asset}: status ${res.status}, Cache-Control "${cache}", expected 200 and immutable`);
    }
  }
  return problems;
}

module.exports = { checkDeploy, ROUTES };

if (require.main === module) {
  const base = process.argv[2];
  if (!base) {
    console.error("usage: node scripts/check-deploy.js <baseUrl>");
    process.exit(2);
  }
  checkDeploy(base).then(
    (problems) => {
      if (problems.length > 0) {
        console.error(`check-deploy found ${problems.length} problem(s) at ${base}:\n- ${problems.join("\n- ")}`);
        process.exit(1);
      }
      console.log(`check-deploy ok: ${base} (${CSP_ENFORCED ? "enforced" : "report-only"} CSP)`);
    },
    (err) => {
      console.error(`check-deploy could not reach ${base}: ${err.message}`);
      process.exit(1);
    },
  );
}
