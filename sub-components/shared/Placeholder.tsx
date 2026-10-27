import Head from "next/head";

const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <section
    className="text-white text-center py-15"
    style={{ minHeight: "100vh" }}
  >
    <Head>
      <title>{`${title} | GNUS.AI Dashboard`}</title>
    </Head>
    <h1 className="display-4 text-white mt-5">{title}</h1>
    <p className="fs-4">This page is not available yet.</p>
  </section>
);

export default Placeholder;
