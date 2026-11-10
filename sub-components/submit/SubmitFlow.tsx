import React from "react";
import Head from "next/head";
import EstimatePanel from "./EstimatePanel";
import JobInput from "./JobInput";
import SubmitPanel from "./SubmitPanel";
import SubmitResult from "./SubmitResult";
import { useSubmit } from "./useSubmit";

const SubmitFlow: React.FC = () => {
  const { state } = useSubmit();
  return (
    <section className="container py-4">
      <Head>
        <title>Submit a job | GNUS.AI Dashboard</title>
      </Head>
      <div className="page-column">
        <h1 className="mb-1">Submit a job</h1>
        <p className="text-body-secondary">
          Load a job definition, estimate what it costs, then pay from your wallet. The network runs
          it and the result shows up under My jobs. New here? Use <b>Load example</b> below &mdash;
          it fills in a complete, working job you can edit field by field.
        </p>
        {state.step === "job" ? (
          <>
            <div className="step-flow">
              <div className="mb-4">
                <span className="step-label">Load the job definition</span>
                <JobInput />
              </div>
              <div className="mb-4">
                <span className="step-label">Estimate the cost</span>
                <EstimatePanel />
              </div>
              <div className="mb-4">
                <span className="step-label">Pay and submit</span>
                <SubmitPanel />
              </div>
            </div>
          </>
        ) : null}
        {state.step === "confirm" ? <SubmitPanel /> : null}
        {state.step === "outcome" ? <SubmitResult /> : null}
      </div>
    </section>
  );
};

export default SubmitFlow;
