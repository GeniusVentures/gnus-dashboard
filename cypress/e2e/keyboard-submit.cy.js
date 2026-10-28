import { installMock } from "../../lib/gnus/mock/install";

// The whole submit flow with Tab and Enter, no pointer. The wallet's own confirm is answered through the mock's control.
describe("submit with the keyboard only", () => {
  let mock;
  const TAB = () => cy.press(Cypress.Keyboard.Keys.TAB);

  const tabTo = (label, left = 40) => {
    TAB();
    cy.focused().then(($el) => {
      if ($el.text().trim() === label) {
        return;
      }
      expect(left, `Tab presses left before ${label}`).to.be.greaterThan(0);
      tabTo(label, left - 1);
    });
  };

  const key = (type, name, text) =>
    Cypress.automation("remote:debugger:protocol", {
      command: "Input.dispatchKeyEvent",
      params: {
        type,
        key: name,
        code: name === "Enter" ? "Enter" : "Space",
        windowsVirtualKeyCode: name === "Enter" ? 13 : 32,
        nativeVirtualKeyCode: name === "Enter" ? 13 : 32,
        ...(type === "keyDown" ? { text } : {}),
      },
    });

  const press = (name, text) => {
    cy.window({ log: false }).then((win) => win.focus());
    ["keyDown", "keyUp"].forEach((type) => cy.then(() => key(type, name, text)));
  };

  it("loads the example, estimates, pays and lands on Job submitted with its heading focused", () => {
    cy.viewport(1300, 800);
    cy.visit("/submit", {
      onBeforeLoad(win) {
        mock = installMock(win, { profile: "manualConfirm" });
      },
    });
    cy.contains("Earning as", { timeout: 12000 });

    tabTo("Load example");
    press("Enter", "\r");
    cy.get("textarea").should("not.have.value", "");

    tabTo("Estimate cost");
    cy.focused().should("be.enabled");
    press(" ", " ");
    cy.contains("button", "Pay and submit", { timeout: 12000 });

    tabTo("Pay and submit");
    cy.focused().should("be.enabled");
    press("Enter", "\r");
    cy.contains("h2", "Confirm in your wallet", { timeout: 12000 });

    cy.then(() => mock.controls.answerConfirm(true));
    cy.contains("h2", "Job submitted", { timeout: 12000 });
    cy.focused().should("have.text", "Job submitted");
  });
});
