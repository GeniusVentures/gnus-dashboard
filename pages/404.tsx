import Head from "next/head";
import Link from "next/link";

const NotFound: React.FC = () => (
  <section
    className="text-white text-center py-15"
    style={{ minHeight: "100vh" }}
  >
    <Head>
      <title>Page not found | GNUS.AI Dashboard</title>
    </Head>
    <h1 className="display-4 text-white mt-5">Page not found</h1>
    <p className="fs-4">This page does not exist.</p>
    <Link href="/">Back to the dashboard</Link>
  </section>
);

export default NotFound;
