import React from "react";
import { render, screen } from "@testing-library/react";
import ExternalLink from "../../sub-components/shared/ExternalLink";
import Socials from "../../sub-components/socials/Socials";
import Footer from "../../layouts/footers/Footer";

describe("ExternalLink", () => {
  it("renders the href, target _blank, rel, class and accessible name it is given", () => {
    render(
      <ExternalLink href="https://example.com/x" className="social-links" aria-label="Example">
        <svg />
      </ExternalLink>,
    );
    const link = screen.getByRole("link", { name: "Example" });
    expect(link).toHaveAttribute("href", "https://example.com/x");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveClass("social-links");
  });

  it("does not let a caller change target or rel", () => {
    render(
      <ExternalLink href="https://example.com" target="_self" rel="opener">
        text
      </ExternalLink>,
    );
    const link = screen.getByRole("link", { name: "text" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("links that leave the dashboard", () => {
  it("gives Socials seven named links that open the system browser safely", () => {
    render(<Socials si="md" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(7);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveClass("social-links");
      expect(link.getAttribute("aria-label")).toBeTruthy();
    }
    expect(links.map((l) => l.getAttribute("aria-label"))).toEqual(
      expect.arrayContaining(["Discord", "Telegram"]),
    );
  });

  it("keeps the footer's Privacy policy and Terms links the same", () => {
    render(<Footer />);
    for (const name of ["Privacy policy", "Terms"]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
