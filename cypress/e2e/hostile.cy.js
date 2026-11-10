import { installMock } from "../../lib/gnus/mock/install";

const IMG_PAYLOAD = '<img src="x" onerror="window.__gnusXss=1">';
const hostileJob = `0x7e57${"0".repeat(59)}9`;

// Every wallet-written string must reach the page as text. A payload that runs sets window.__gnusXss or adds an element.
describe("hostile wallet text stays text", () => {
  let page;
  const visit = (path, profile) =>
    cy.visit(path, {
      onBeforeLoad(win) {
        page = win;
        installMock(win, { profile });
      },
    });
  const inert = () => {
    cy.wait(300);
    cy.window().then((win) => expect(win.__gnusXss).to.equal(undefined));
    cy.get("img[src='x'], img[onerror], main script, footer script").should("not.exist");
  };

  it("the home page and Earnings have nothing to run", () => {
    visit("/", "hostileText");
    cy.contains("Earning as", { timeout: 12000 });
    inert();
    visit("/earnings", "hostileText");
    cy.contains("h1", "Earnings", { timeout: 12000 });
    inert();
  });

  it("My jobs shows a hostile origin as text", () => {
    visit("/jobs", "hostileText");
    cy.get("tbody tr", { timeout: 12000 }).should("have.length", 9);
    cy.contains(IMG_PAYLOAD);
    inert();
  });

  it("a hostile job's detail shows its origin, error and result data as text", () => {
    visit(`/jobs/detail?hash=${hostileJob}`, "hostileText");
    cy.contains("h1", "Job", { timeout: 12000 });
    cy.contains(IMG_PAYLOAD);
    cy.contains("<script>window.__gnusXss=1</script>");
    inert();
  });

  it("an estimate rejected with a hostile -32602 message shows it as text", () => {
    visit("/submit", "hostileText");
    cy.contains("button", "Load example", { timeout: 12000 }).click();
    cy.contains("button", "Estimate cost").should("be.enabled").click();
    cy.contains("GeniusWallet rejected the request.", { timeout: 12000 });
    cy.contains(IMG_PAYLOAD);
    inert();
  });

  it("a submit rejected with a hostile -32602 message shows it as text", () => {
    visit("/submit", "hostileSubmit");
    cy.contains("button", "Load example", { timeout: 12000 }).click();
    cy.contains("button", "Estimate cost").should("be.enabled").click();
    cy.contains("button", "Pay and submit", { timeout: 12000 }).should("be.enabled").click();
    cy.contains("GeniusWallet rejected the request.", { timeout: 12000 });
    cy.contains(IMG_PAYLOAD);
    inert();
  });

  it("the no-wallet screen and the 404 page have nothing to run either", () => {
    cy.visit("/", { onBeforeLoad: (win) => (page = win) });
    cy.contains("h1", "GeniusWallet required", { timeout: 12000 });
    inert();
    cy.visit("/no-such-page", { failOnStatusCode: false });
    cy.contains("h1", "Page not found");
    inert();
  });
});
