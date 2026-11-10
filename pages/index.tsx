import Head from "next/head";
import Link from "next/link";
import WalletGate from "../sub-components/wallet/WalletGate";

const Dashboard: React.FC = () => (
  <WalletGate>
    <section className="container">
      <Head>
        <title>Dashboard | GNUS.AI Dashboard</title>
      </Head>
      <div className="hero">
        <p className="micro-label">GNUS.AI Dashboard</p>
        <h1>
          Submit <span className="accent">compute jobs</span>.
          <br />
          Watch the network run them.
        </h1>
        <p className="lead">
          Send a job to the SuperGenius network from this dashboard. Your wallet confirms the payment,
          your earning account receives the result, and every job is tracked here.
        </p>
        <div className="d-flex flex-wrap justify-content-center gap-3 mt-4">
          <Link href="/submit" className="btn btn-primary btn-lg px-4">
            Submit a job
          </Link>
          <Link href="/jobs" className="btn btn-outline-secondary btn-lg px-4">
            My jobs
          </Link>
        </div>
        <p className="mt-3 mb-0 text-body-secondary small">
          How it works: 1 &mdash; connect your wallet &middot; 2 &mdash; submit a job &middot; 3 &mdash; track it
          under My jobs and watch your earnings grow. <Link href="/earnings">Earnings</Link>
        </p>
      </div>
      <div className="identity-explainer">
        <div className="card">
          <div className="card-body">
            <h2 className="card-title">Earning as</h2>
            <p className="card-text mb-0">
              The account your jobs and their earnings belong to. Your node processes work under this identity.
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <h2 className="card-title">Paying from</h2>
            <p className="card-text mb-0">The wallet that pays for the jobs you submit. Every payment needs your approval.</p>
          </div>
        </div>
      </div>
    </section>
  </WalletGate>
);

export default Dashboard;
