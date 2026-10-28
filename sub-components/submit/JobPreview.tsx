import React, { useMemo } from "react";
import type { ParsedJob } from "../../lib/submit/job";

// The wallet gets exactly this object; it renders as text only.
const JobPreview: React.FC<{ parsed: ParsedJob }> = ({ parsed }) => {
  const text = useMemo(() => (parsed.state === "ok" ? JSON.stringify(parsed.job, null, 2) : null), [parsed]);
  if (text === null) {
    return null;
  }
  return (
    <section className="mb-3" aria-labelledby="job-preview-heading">
      <h2 id="job-preview-heading" className="h5">
        What will be sent
      </h2>
      <pre
        tabIndex={0}
        aria-labelledby="job-preview-heading"
        className="border rounded p-2 mb-0 overflow-auto"
        style={{ maxHeight: "20rem" }}
      >
        {text}
      </pre>
    </section>
  );
};

export default JobPreview;
