import React from "react";
import Socials from "sub-components/socials/Socials";
import ExternalLink from "../../sub-components/shared/ExternalLink";

const Footer: React.FC = () => (
  <footer className="border-top py-3 mt-5">
    <div className="container d-flex flex-wrap align-items-center justify-content-between gap-3">
      <span>{`GNUS.AI © ${new Date().getFullYear()}. All Rights Reserved.`}</span>
      <Socials si="sm" />
      <span className="d-flex gap-3">
        <ExternalLink href="https://www.gnus.ai/privacypolicy.html">Privacy policy</ExternalLink>
        <ExternalLink href="https://www.gnus.ai/tos.html">Terms</ExternalLink>
      </span>
    </div>
  </footer>
);

export default Footer;
