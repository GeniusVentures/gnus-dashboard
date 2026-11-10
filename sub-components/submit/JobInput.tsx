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
      <p className="text-body-secondary mb-2">
        A job is a processing definition: what to run (a model pass), what data it reads (inputs), and
        what it writes (outputs). The easiest start is the example &mdash; load it, then edit the fields
        described below. The form validates as you type.
      </p>
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
      <details className="mt-3">
        <summary className="text-body-secondary">What needs to be in the JSON</summary>
        <div className="table-responsive">
          <table className="table table-sm mt-2 mb-0 small">
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">What it is</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>name</code>, <code>version</code>, <code>author</code>, <code>description</code>, <code>tags</code></td>
                <td>Who and what the job is. Free-form; only you and other users see these.</td>
              </tr>
              <tr>
                <td><code>gnus_spec_version</code></td>
                <td>Must be <code>1</code> &mdash; the definition format this dashboard and the network speak.</td>
              </tr>
              <tr>
                <td><code>inputs[]</code></td>
                <td>
                  Data the job reads. <code>source_uri_param</code> must be a URL the network can fetch
                  (IPFS or HTTPS). <code>type</code> is <code>texture2D</code> for image data,
                  <code>tensor</code> for raw numbers. Texture inputs need the <code>dimensions</code>
                  block (tile geometry); copy it from the example and adjust to your image.
                </td>
              </tr>
              <tr>
                <td><code>outputs[]</code></td>
                <td>What the job writes back. <code>source_uri_param</code> stays <code>&quot;dummy&quot;</code> &mdash;
                the network fills it in.</td>
              </tr>
              <tr>
                <td><code>passes[]</code></td>
                <td>
                  The work itself, usually one <code>inference</code> pass. <code>model.source_uri_param</code>
                  points at a model file (MNN). <code>input_nodes[].source</code> wires a model input to a job
                  input with <code>input:&lt;input name&gt;</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="small text-body-secondary mt-2 mb-0">
          The network fetches every <code>source_uri_param</code> when the job runs &mdash; the example&apos;s
          IPFS links are live and can be reused for your own tests.
        </p>
      </details>
    </div>
  );
};

export default JobInput;
