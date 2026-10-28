import "../styles/theme.scss";
import "react-toastify/dist/ReactToastify.css";

import React from "react";
import Head from "next/head";
import DefaultLayout from "../layouts/DefaultLayout";
import { ToastContainer } from "react-toastify";
import { SessionProvider } from "../sub-components/wallet/SessionProvider";
import type { AppProps } from "next/app";

// Dev and test builds only; CI proves the export carries none of it.
if (process.env.NEXT_PUBLIC_GNUS_MOCK === "1" && typeof window !== "undefined") {
  require("../lib/gnus/mock/install").installMockFromLocation(window);
}

const GNUSDashboard: React.FC<AppProps> = ({ Component, pageProps }) => {
  const Layout = DefaultLayout;

  return (
    <>
      <Head>
        <title>GNUS.AI Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <base href="/" />
      </Head>
      <ToastContainer
        pauseOnHover={true}
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick={true}
        draggable={false}
      />
      <SessionProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </SessionProvider>
    </>
  );
};

export default GNUSDashboard;
