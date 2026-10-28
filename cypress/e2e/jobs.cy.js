import { installMock } from "../../lib/gnus/mock/install";

let mock;
const visit = (path, profile = "jobHistory") =>
  cy.visit(path, {
    onBeforeLoad(win) {
      mock = installMock(win, { profile });
    },
  });
const hashOf = (n) => `0x5eed${n.toString(16).padStart(60, "0")}`;
const shortOf = (n) => `0x5eed...${n.toString(16).padStart(4, "0")}`;

describe("My jobs", () => {
  it("lists the seeded jobs newest first with their short ids and cost", () => {
    visit("/jobs");
    cy.get("h1", { timeout: 12000 }).should("have.text", "My jobs");
    cy.get("tbody tr").should("have.length", 20);
    cy.get("tbody tr").first().should("contain", shortOf(25)).and("contain", "3 GNUS");
    cy.get("tbody tr").last().should("contain", shortOf(6));
    cy.get("tbody tr")
      .first()
      .find("a")
      .should("have.attr", "href", `/jobs/detail?hash=${hashOf(25)}`);
  });

  it("loads the second page, then offers no more", () => {
    visit("/jobs");
    cy.contains("button", "Load more jobs", { timeout: 12000 }).click();
    cy.get("tbody tr").should("have.length", 25);
    cy.contains("button", "Load more jobs").should("not.exist");
    cy.get("tbody tr").eq(20).find("a").should("have.focus");
    cy.contains("Showing 25 jobs");
  });

  it("shows the empty state for an account with no jobs", () => {
    visit("/jobs", "today");
    cy.contains("h2", "No jobs yet", { timeout: 12000 });
    cy.contains("a", "Submit a job").should("have.attr", "href", "/submit");
    cy.get("table").should("not.exist");
  });

  it("shows the error state with Retry when the list cannot be read", () => {
    visit("/jobs", "readsFail");
    cy.contains("h2", "Couldn't load your jobs", { timeout: 12000 });
    cy.contains("GeniusWallet hit an internal error.");
    cy.contains("button", "Retry");
    cy.get("h1").should("have.text", "My jobs");
  });

  it("empties the list when the node account switches", () => {
    visit("/jobs");
    cy.get("tbody tr", { timeout: 12000 }).should("have.length", 20);
    cy.then(() => mock.controls.switchAccount());
    cy.contains("h2", "No jobs yet");
    cy.get("table").should("not.exist");
  });

  it("marks paid-but-not-processed and unconfirmed rows with their explanation", () => {
    visit("/jobs");
    cy.get("tbody tr", { timeout: 12000 }).should("have.length", 20);
    cy.contains("td", "Paid but not processed").should("contain", "Check it in GeniusWallet.");
    cy.contains("td", "Payment not confirmed").should("contain", "The GNUS may be spent");
    cy.contains("td", "Submitted to the network").should("not.contain", "GeniusWallet can't report");
  });
});

const resultHash = (n) => `0x7e57${n.toString(16).padStart(60, "0")}`;

describe("Job detail", () => {
  it("shows every field for a deep link opened fresh", () => {
    visit(`/jobs/detail?hash=${hashOf(3)}`);
    cy.get("h1", { timeout: 12000 }).should("have.text", "Job detail");
    cy.contains("dd", "Job id pending");
    cy.contains("dd", "3 GNUS");
    cy.contains("dd", "seed-3");
    cy.contains("Result not available yet");
    cy.get("button[aria-label='Copy burn transaction hash']");
  });

  it("opens the same view from a row link in the list", () => {
    visit("/jobs");
    cy.get("tbody tr", { timeout: 12000 }).first().find("a").click();
    cy.get("h1").should("have.text", "Job detail");
    cy.contains("dd", "seed-25");
    cy.url().should("include", `hash=${hashOf(25)}`);
  });

  it("says when the link names no job or the account has none", () => {
    visit("/jobs/detail");
    cy.contains("This link doesn't name a job.", { timeout: 12000 });
    visit(`/jobs/detail?hash=0x${"9".repeat(64)}`);
    cy.contains("No job found", { timeout: 12000 });
  });

  it("links a completed job's CIDs to the gateway and shows its data", () => {
    visit(`/jobs/detail?hash=${resultHash(4)}`, "jobResults");
    cy.contains("h2", "Result", { timeout: 12000 });
    cy.contains("a", "Open in IPFS gateway")
      .should("have.attr", "href", `https://ipfs.io/ipfs/bafy${"a".repeat(40)}`)
      .and("have.attr", "target", "_blank");
    cy.get("a[href^='https://ipfs.io/ipfs/']").should("have.length", 2);
    cy.get("pre").should("contain.text", '"frames": 24');
  });

  it("shows a failed job's error as text", () => {
    visit(`/jobs/detail?hash=${resultHash(5)}`, "jobResults");
    cy.contains("h2", "Error", { timeout: 12000 });
    cy.contains("The node ran out of memory.");
  });

  it("shows the hostile job's payload as text and runs none of it", () => {
    visit(`/jobs/detail?hash=${resultHash(9)}`, "jobResults");
    cy.contains("h2", "Error", { timeout: 12000 });
    cy.contains('<img src="x" onerror="window.__gnusXss=1">');
    cy.get("img[src='x']").should("not.exist");
    cy.get("main script").should("not.exist");
    cy.window().its("__gnusXss").should("be.undefined");
  });
});

describe("My jobs with every state", () => {
  it("shows the nine seeded jobs, an unseen status as Status unknown, and marked rows with their words", () => {
    visit("/jobs", "jobResults");
    cy.get("tbody tr", { timeout: 12000 }).should("have.length", 9);
    cy.contains("td", "Status unknown");
    cy.contains("td", "Paid but not processed").should("contain", "Check it in GeniusWallet.");
    cy.contains("td", "Completed");
    cy.window().its("__gnusXss").should("be.undefined");
  });
});

const listReads = () => mock.controls.calls.filter((c) => c.method === "gnus_listJobs").length;

describe("Live updates and search", () => {
  it("changes a row in place when the wallet reports a new status", () => {
    visit("/jobs");
    cy.get("tbody tr", { timeout: 12000 }).first().should("contain", "Submitted to the network");
    cy.then(() => mock.controls.advanceJob(hashOf(25), "processing"));
    cy.get("tbody tr").first().should("contain", "Processing");
    cy.then(() => expect(listReads()).to.eq(1));
  });

  it("updates an open detail and reads its result when the job completes", () => {
    visit(`/jobs/detail?hash=${hashOf(25)}`);
    cy.contains("Submitted to the network", { timeout: 12000 });
    cy.then(() => mock.controls.advanceJob(hashOf(25), "completed"));
    cy.contains("dd", "Completed");
    cy.then(() => {
      expect(mock.controls.calls.filter((c) => c.method === "gnus_getJob")).to.have.length(2);
    });
  });

  it("reads the list again when the tab becomes visible", () => {
    visit("/jobs");
    cy.get("tbody tr", { timeout: 12000 }).should("have.length", 20);
    cy.window().then((win) => win.dispatchEvent(new win.Event("visibilitychange")));
    cy.wrap(null).should(() => expect(listReads()).to.eq(2));
  });

  it("recovers from a disconnect with Retry and reads the list again", () => {
    visit("/jobs");
    cy.get("tbody tr", { timeout: 12000 }).should("have.length", 20);
    cy.then(() => mock.controls.disconnect());
    cy.get("h1").should("have.text", "GeniusWallet isn't responding");
    cy.contains("button", "Retry").click();
    cy.get("tbody tr", { timeout: 12000 }).should("have.length", 20);
    cy.wrap(null).should(() => expect(listReads()).to.eq(2));
  });

  it("filters loaded rows by what is typed", () => {
    visit("/jobs");
    cy.get("tbody tr", { timeout: 12000 }).should("have.length", 20);
    cy.get("#job-search").type("0019");
    cy.get("tbody tr").should("have.length", 1);
    cy.get("#job-search").clear().type("zzzz");
    cy.contains("No loaded job matches.");
  });

  it("opens a job that is not loaded by its whole burn hash", () => {
    visit("/jobs");
    cy.get("tbody tr", { timeout: 12000 }).should("have.length", 20);
    cy.get("#job-search").type(`${hashOf(2)}{enter}`);
    cy.url().should("include", `/jobs/detail?hash=${hashOf(2)}`);
    cy.get("h1").should("have.text", "Job detail");
    cy.contains("dd", "seed-2");
  });

  it("asks for the whole hash when a 0x string stops short", () => {
    visit("/jobs");
    cy.get("tbody tr", { timeout: 12000 }).should("have.length", 20);
    cy.get("#job-search").type("0x12{enter}");
    cy.contains("Enter the whole burn hash (0x and 64 characters) to look it up.");
    cy.location("pathname").should("eq", "/jobs");
  });
});

