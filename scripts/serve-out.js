// Plain static server for out/: exact file, then .html, then /index.html, else the 404 page.
// Every response carries the headers scripts/headers.js writes into out/_headers for the host.
// With a command (node scripts/serve-out.js yarn cy:run) it runs that command against the server, then stops and exits with the command's code.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { headersFor } = require("./headers");

const root = path.resolve(__dirname, "..", "out");
const port = Number(process.env.PORT) || 4173;

if (!fs.existsSync(root)) {
  console.error("out/ is missing: run yarn build first");
  process.exit(1);
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
};

const isFile = (p) => {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
};

const resolveFile = (pathname) => {
  if (pathname.includes("\\") || pathname.includes("\0")) {
    return null;
  }
  const target = path.resolve(root, "." + pathname);
  if (target !== root && !target.startsWith(root + path.sep)) {
    return null;
  }
  if (pathname === "/") {
    return path.join(root, "index.html");
  }
  for (const candidate of [target, target + ".html", path.join(target, "index.html")]) {
    if (isFile(candidate)) {
      return candidate;
    }
  }
  return null;
};

const send = (res, status, file, head, pathname) => {
  const body = fs.readFileSync(file);
  const type = types[path.extname(file).toLowerCase()] || "application/octet-stream";
  res.writeHead(status, {
    ...Object.fromEntries(headersFor(pathname, { html: type.startsWith("text/html") })),
    "Content-Type": type,
    "Content-Length": body.length,
  });
  res.end(head ? undefined : body);
};

const server = http
  .createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD", ...Object.fromEntries(headersFor("/")) });
      res.end();
      return;
    }
    const head = req.method === "HEAD";
    let pathname;
    try {
      pathname = decodeURIComponent(req.url.split(/[?#]/)[0]);
    } catch {
      res.writeHead(400, Object.fromEntries(headersFor("/")));
      res.end();
      return;
    }
    const file = resolveFile(pathname);
    if (file) {
      send(res, 200, file, head, pathname);
    } else {
      send(res, 404, path.join(root, "404.html"), head, pathname);
    }
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`serving out/ on http://127.0.0.1:${port}`);
    const command = process.argv.slice(2).join(" ");
    if (command) {
      // Async spawn: the server must keep answering while the command runs.
      require("child_process")
        .spawn(command, { stdio: "inherit", shell: true })
        .on("exit", (code) => {
          server.close();
          process.exit(code ?? 1);
        });
    }
  });
