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
      <h1 className="display-6 mb-4">Submit a job</h1>
      {state.step === "job" ? (
        <>
          <JobInput />
          <EstimatePanel />
          <SubmitPanel />
        </>
      ) : null}
      {state.step === "confirm" ? <SubmitPanel /> : null}
      {state.step === "outcome" ? <SubmitResult /> : null}
    </section>
  );
};

export default SubmitFlow;
