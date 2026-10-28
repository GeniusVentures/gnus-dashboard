const http = require("http");
const { CSP_ENFORCED, cspName, headersFor } = require("../../scripts/headers");
const { checkDeploy } = require("../../scripts/check-deploy");

const ASSET = "/_next/static/chunks/main-abc.js";
const PAGE = `<html><body><script src="${ASSET}"></script></body></html>`;
const NOT_FOUND = "<html><body><h1>Page not found</h1></body></html>";
const ROUTES = ["/", "/submit", "/jobs", "/jobs/detail", "/earnings"];

// The jsdom test environment has no fetch; this answers with the three members check-deploy reads.
function nodeFetch(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: { get: (name) => res.headers[name.toLowerCase()] ?? null },
            text: async () => body,
          }),
        );
      })
      .on("error", reject);
  });
}

// A host that behaves, with one thing bent by `bend`.
function host(bend = {}) {
  const server = http.createServer((req, res) => {
    const pathname = req.url.split("?")[0];
    let status = 200;
    let body = PAGE;
    let type = "text/html; charset=utf-8";
    let headers = headersFor(pathname, { html: true, enforced: bend.enforced });
    if (pathname === ASSET) {
      body = "x";
      type = "text/javascript";
      headers = headersFor(pathname);
      if (bend.assetCache) {
        headers = headers.filter(([name]) => name !== "Cache-Control");
      }
    } else if (!ROUTES.includes(pathname) || (pathname === "/jobs" && bend.jobs404)) {
      status = 404;
      body = bend.wrong404 ? PAGE : NOT_FOUND;
    }
    if (bend.noPolicy) {
      headers = headers.filter(([name]) => !name.startsWith("Content-Security-Policy"));
    }
    if (bend.immutableHtml && type.startsWith("text/html")) {
      headers = headers.filter(([name]) => name !== "Cache-Control").concat([["Cache-Control", "public, immutable"]]);
    }
    res.writeHead(status, { ...Object.fromEntries(headers), "Content-Type": type });
    res.end(body);
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () =>
      resolve({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }),
    ),
  );
}

async function problemsFor(bend, options) {
  const served = await host(bend);
  try {
    return await checkDeploy(served.url, { fetchImpl: nodeFetch, ...options });
  } finally {
    served.close();
  }
}

describe("check-deploy", () => {
  test("a host that sends the table passes", async () => {
    expect(await problemsFor({})).toEqual([]);
  });

  test("a route that answers 404 is named", async () => {
    const problems = await problemsFor({ jobs404: true });
    expect(problems).toEqual(["/jobs: status 404, expected 200"]);
  });

  test("HTML without the policy is named", async () => {
    const problems = await problemsFor({ noPolicy: true });
    expect(problems.some((p) => p.startsWith(`/: ${cspName(CSP_ENFORCED)} is missing`))).toBe(true);
  });

  test("HTML marked immutable is named", async () => {
    const problems = await problemsFor({ immutableHtml: true });
    expect(problems.some((p) => p.includes("/jobs: HTML Cache-Control"))).toBe(true);
  });

  test("a static file that is not immutable is named", async () => {
    const problems = await problemsFor({ assetCache: true });
    expect(problems.some((p) => p.startsWith(`${ASSET}:`))).toBe(true);
  });

  test("an unknown path that does not show the 404 page is named", async () => {
    const problems = await problemsFor({ wrong404: true });
    expect(problems.some((p) => p.includes("/no-such-page: the body is not the 404 page"))).toBe(true);
  });

  test("a host in report-only mode fails an enforced check, and the other way round", async () => {
    expect(await problemsFor({ enforced: true }, { enforced: true })).toEqual([]);
    expect(await problemsFor({ enforced: false }, { enforced: false })).toEqual([]);
    const reverse = await problemsFor({ enforced: true }, { enforced: false });
    expect(reverse.some((p) => p.includes("sends Content-Security-Policy, expected only Content-Security-Policy-Report-Only"))).toBe(true);
    const problems = await problemsFor({ enforced: false }, { enforced: true });
    expect(
      problems.some((p) => p.includes("sends Content-Security-Policy-Report-Only, expected only Content-Security-Policy")),
    ).toBe(true);
  });
});
