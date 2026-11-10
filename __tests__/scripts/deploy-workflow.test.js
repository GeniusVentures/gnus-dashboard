const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, ".github", "workflows", file), "utf8");
const workflow = read("deploy.yml");

// The text of each job: from its two-space key to the next one.
function jobs(text) {
  const body = text.slice(text.indexOf("\njobs:\n") + 1);
  const found = {};
  const parts = body.split(/^  ([a-z-]+):\n/m);
  for (let i = 1; i < parts.length; i += 2) {
    found[parts[i]] = parts[i + 1];
  }
  return found;
}

const { build, deploy, verify } = jobs(workflow);

describe("deploy.yml triggers and fork rule", () => {
  test("runs on a push to main and on pull requests", () => {
    expect(workflow).toMatch(/^on:\n {2}push:\n {4}branches: \[main\]\n {2}pull_request:\n/m);
  });

  test("only builds a pull request from this repository, and the other jobs wait for the build", () => {
    expect(build).toContain("github.event.pull_request.head.repo.full_name == github.repository");
    expect(deploy).toContain("needs: build");
    expect(verify).toContain("needs: deploy");
  });

  test("a push uses the production environment and a pull request the preview one", () => {
    for (const job of [build, deploy]) {
      expect(job).toContain("environment: ${{ github.event_name == 'push' && 'production' || 'preview' }}");
    }
  });
});

describe("build", () => {
  test("references no secret and builds with the environment's Reown id", () => {
    expect(build).not.toMatch(/secrets\./);
    expect(build).toContain("yarn install --frozen-lockfile");
    expect(build).toContain("NEXT_PUBLIC_WC_PROJECT_ID: ${{ vars.NEXT_PUBLIC_WC_PROJECT_ID }}");
  });

  test("checks the export with check-deploy against the local server, then uploads out/", () => {
    expect(build).toContain("node scripts/serve-out.js node scripts/check-deploy.js http://127.0.0.1:4173");
    expect(build.indexOf("check-deploy.js")).toBeLessThan(build.indexOf("upload-artifact"));
    expect(build).toMatch(/path: out\n/);
  });
});

describe("deploy", () => {
  test("never checks out or runs repository code", () => {
    expect(deploy).not.toMatch(/actions\/checkout/);
    expect(deploy).not.toMatch(/yarn |npm |node scripts/);
  });

  test("runs wrangler from the pinned action and the pinned version", () => {
    expect(deploy).toContain("cloudflare/wrangler-action@953926a2e2182532811c01a25e53647d93bf07c0 # v4.1.3");
    expect(deploy).toContain('wranglerVersion: "4.154.0"');
    expect(deploy).toContain("pages deploy out --project-name=${{ vars.CLOUDFLARE_PAGES_PROJECT }}");
  });

  test("deploys main from a push and pr-<number> from a pull request", () => {
    expect(deploy).toContain("--branch=${{ github.event_name == 'push' && 'main' || format('pr-{0}', github.event.pull_request.number) }}");
  });

  test("skips with a notice naming what to set when a secret or the project variable is empty", () => {
    expect(deploy).toContain("::notice");
    expect(deploy).toContain("for name in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_PAGES_PROJECT");
    expect(deploy.match(/if: steps\.config\.outputs\.ready == 'true'/g)).toHaveLength(2);
    expect(deploy).toContain("ready=false");
  });

  test("outputs the deployment URL and the production origin", () => {
    expect(deploy).toContain("url: ${{ steps.wrangler.outputs.deployment-url }}");
    expect(deploy).toContain("origin: ${{ vars.DASHBOARD_ORIGIN }}");
  });

  test("hands the token to nothing but the configuration check and wrangler", () => {
    const uses = deploy.match(/secrets\.CLOUDFLARE_API_TOKEN/g);
    expect(uses).toHaveLength(2);
  });
});

describe("verify", () => {
  test("references no secret and runs check-deploy on the deployment URL, and on the production origin when set", () => {
    expect(verify).not.toMatch(/secrets\./);
    expect(verify).toContain("if: needs.deploy.outputs.url != ''");
    expect(verify).toContain('node scripts/check-deploy.js "$DEPLOY_URL"');
    expect(verify).toContain("github.event_name == 'push' && needs.deploy.outputs.origin != ''");
    expect(verify).toContain('node scripts/check-deploy.js "$DASHBOARD_ORIGIN"');
  });
});

describe("every action is pinned", () => {
  test.each(["deploy.yml", "ci.yml"])("%s pins each third-party action to a full commit SHA with its version", (file) => {
    const lines = read(file)
      .split("\n")
      .filter((line) => /uses: /.test(line));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).toMatch(/uses: [\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/);
    }
  });
});

describe("the EC2 workflow", () => {
  const ec2 = read("aws-ec2-deploy.yml");

  test("stays manual and fails at its first step", () => {
    expect(ec2).toMatch(/^on:\n {2}workflow_dispatch:\n/m);
    expect(ec2).not.toMatch(/^ {2}(push|pull_request):/m);
    expect(ec2).toContain("exit 1");
    expect(ec2.indexOf("exit 1")).toBeLessThan(ec2.indexOf("Deploy to AWS/EC2"));
  });
});
