import React from "react";
import { STATUS_TEXT } from "../../lib/jobs";
import type { JobStatus } from "../../lib/gnus/schema";

// The status is always words; colour is only a second signal.
const JobStatusBadge: React.FC<{ status: JobStatus; explain?: boolean }> = ({ status, explain = false }) => {
  const info = STATUS_TEXT[status];
  return (
    <>
      <span className={`badge text-bg-${info.variant}`}>{info.label}</span>
      {explain ? <div className="small mt-1">{info.explanation}</div> : null}
    </>
  );
};

export default JobStatusBadge;
