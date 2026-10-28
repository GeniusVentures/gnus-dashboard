import Head from "next/head";
import Link from "next/link";
import WalletGate from "../sub-components/wallet/WalletGate";
import NavbarDefaultRoutes from "../data/navbars/navbarRoutes";

const Dashboard: React.FC = () => (
  <WalletGate>
    <section className="container text-center py-5">
      <Head>
        <title>Dashboard | GNUS.AI Dashboard</title>
      </Head>
      <h1 className="display-4">Dashboard</h1>
      <p className="fs-5">
        Earning as is the node account that owns your jobs and earnings. Paying from is the wallet that pays for the
        jobs you submit.
      </p>
      <p className="d-flex flex-wrap justify-content-center gap-4 fs-5">
        {NavbarDefaultRoutes.map((item) => (
          <Link key={item.link} href={item.link}>
            {item.menuitem}
          </Link>
        ))}
      </p>
    </section>
  </WalletGate>
);

export default Dashboard;
