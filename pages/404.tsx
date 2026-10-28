import Head from "next/head";
import Link from "next/link";

const NotFound: React.FC = () => (
  <section className="text-center py-5">
    <Head>
      <title>Page not found | GNUS.AI Dashboard</title>
    </Head>
    <h1 className="display-4">Page not found</h1>
    <p className="fs-4">This page does not exist.</p>
    <Link href="/">Back to the dashboard</Link>
  </section>
);

export default NotFound;
