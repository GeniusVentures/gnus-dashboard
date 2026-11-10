import React from "react";

// The only element allowed to carry target; lint enforces it. target and rel are not props.
const ExternalLink: React.FC<{
  href: string;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}> = ({ href, children, className, "aria-label": ariaLabel }) => (
  <a href={href} className={className} aria-label={ariaLabel} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

export default ExternalLink;
