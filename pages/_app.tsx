import "dotenv/config";
import "../styles/theme.scss";
import "react-tooltip/dist/react-tooltip.css";
import "react-toastify/dist/ReactToastify.css";

import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import DefaultLayout from "../layouts/DefaultLayout";
import { NextSeo } from "next-seo";
import { Provider } from "react-redux";
import { store } from "../store/store";
import { IPFSWrapper } from "../context/ipfs/IPFSContext";
import { ToastContainer } from "react-toastify";
import type { AppProps } from "next/app";
import { Web3Modal } from "context/wallet/Web3Modal";
import { PricesWrapper } from "context/prices/PricesContext";
import { Tooltip } from "react-tooltip";

const GNUSDashboard: React.FC<AppProps> = ({ Component, pageProps }) => {
  const router = useRouter();
  const pageURL = process.env.baseURL + router.pathname;
  const title = "GNUS.AI Dashboard";

  const Layout = DefaultLayout;

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <base href="/" />
      </Head>
      <NextSeo
        title={title}
        canonical={pageURL}
        openGraph={{
          url: pageURL,
          title: title,
          site_name: "GNUS Dashboard",
          images: [
            {
              url: "images/logo/funding-chain-logo.png",
              alt: "GNUS.AI Icon",
            },
          ],
        }}
      />
      <Provider store={store}>
        <ToastContainer
          pauseOnHover={true}
          autoClose={3000}
          hideProgressBar={false}
          closeOnClick={true}
          draggable={false}
        />
        <Web3Modal>
          <PricesWrapper>
            <IPFSWrapper>
              <Layout>
                <Component {...pageProps} />
              </Layout>
            </IPFSWrapper>
          </PricesWrapper>
        </Web3Modal>
      </Provider>
      <Tooltip
        id="price-gas-tooltip"
        delayHide={300}
        delayShow={300}
        style={{ zIndex: 50000 }}
        place="bottom"
        offset={20}
        className="tooltip-custom"
      />
    </>
  );
};

export default GNUSDashboard;
