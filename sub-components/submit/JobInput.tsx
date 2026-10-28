import React, { useState } from "react";
import { FILE_TOO_LARGE, fileTooLarge } from "../../lib/submit/job";
import JobPreview from "./JobPreview";
import { useSubmit } from "./useSubmit";

const READ_FAILED = "This file could not be read.";

const JobInput: React.FC = () => {
  const { state, store } = useSubmit();
  const [fileError, setFileError] = useState<string | null>(null);
  const parseError = state.parsed.state === "invalid" ? state.parsed.message : null;
  const message = fileError ?? parseError;

  async function choose(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    // A file over the cap is refused by its size, before any of it is read.
    if (fileTooLarge(file.size)) {
      setFileError(FILE_TOO_LARGE);
    } else {
      try {
        const text = await file.text();
        setFileError(null);
        store.setText(text);
      } catch {
        setFileError(READ_FAILED);
      }
    }
    input.value = "";
  }

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
        onChange={(event) => {
          setFileError(null);
          store.setText(event.target.value);
        }}
      />
      {message ? (
        <p id="job-json-error" role="alert" className="text-danger-emphasis mt-2 mb-0">
          {message}
        </p>
      ) : null}
      <div className="d-flex flex-wrap align-items-center gap-3 mt-2">
        <button
          type="button"
          className="btn border"
          onClick={() => {
            setFileError(null);
            store.loadExample();
          }}
        >
          Load example
        </button>
        <label htmlFor="job-file" className="form-label mb-0">
          Choose a file
        </label>
        <input
          id="job-file"
          type="file"
          className="form-control w-auto"
          accept=".json,application/json"
          onChange={(event) => void choose(event)}
        />
      </div>
      <JobPreview parsed={state.parsed} />
    </div>
  );
};

export default JobInput;
