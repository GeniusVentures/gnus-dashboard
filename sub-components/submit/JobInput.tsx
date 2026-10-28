import React from "react";
import { useSubmit } from "./useSubmit";

const JobInput: React.FC = () => {
  const { state, store } = useSubmit();
  const message = state.parsed.state === "invalid" ? state.parsed.message : null;
  return (
    <div className="mb-3">
      <label htmlFor="job-json" className="form-label">
        Job JSON
      </label>
      <textarea
        id="job-json"
        className="form-control font-monospace"
        rows={12}
        spellCheck={false}
        value={state.text}
        aria-describedby={message ? "job-json-error" : undefined}
        aria-invalid={message ? true : undefined}
        onChange={(event) => store.setText(event.target.value)}
      />
      {message ? (
        <p id="job-json-error" role="alert" className="text-danger-emphasis mt-2 mb-0">
          {message}
        </p>
      ) : null}
      <button type="button" className="btn btn-outline-secondary mt-2" onClick={store.loadExample}>
        Load example
      </button>
    </div>
  );
};

export default JobInput;
