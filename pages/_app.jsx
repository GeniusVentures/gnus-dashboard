import Head from "next/head";
import { useRouter } from "next/router";
import DefaultLayout from "../layouts/DefaultLayout";
import { NextSeo } from "next-seo";
import { Provider } from "react-redux";
import { store } from "../store/store";
import "../styles/theme.scss";

function ETHDenver({ Component, pageProps }) {
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
          site_name: "GNUS 2FA",
          images: [
            {
              url: "images/logo/funding-chain-logo.png",
              alt: "GNUS.AI Icon",
            },
          ],
        }}
      />
      <Provider store={store}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </Provider>
    </>
  );
}

export default ETHDenver;
