import Head from "next/head";

const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <section className="text-center py-5">
    <Head>
      <title>{`${title} | GNUS.AI Dashboard`}</title>
    </Head>
    <h1 className="display-4">{title}</h1>
    <p className="fs-4">This page is not available yet.</p>
  </section>
);

export default Placeholder;
