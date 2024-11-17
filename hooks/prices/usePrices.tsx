import { useState, useEffect } from "react";
import axios from "axios";

interface Prices {
  price: number | null;
  percentChange24h: number | null;
  gasPrice: number | null;
  error: string | null;
  updated: string | null;
}

export const usePrices = (): Prices => {
  const [prices, setPrices] = useState<Prices>({
    price: null,
    percentChange24h: null,
    gasPrice: null,
    error: null,
    updated: null,
  });

  const fetchPrices = async () => {
    try {
      let highestPrice = prices.price;
      let percentChange24h = prices.percentChange24h;

      const coingeckoResponse = await axios
        .get(
          "https://api.coingecko.com/api/v3/simple/price?ids=genius-ai&vs_currencies=usd"
        )
        .catch((err) => {
          console.error("CoinGecko Error:", err);
          return null;
        });

      if (coingeckoResponse && coingeckoResponse.data) {
        const coingeckoPrice = coingeckoResponse.data["genius-ai"]?.usd || 0;
        highestPrice = Math.max(highestPrice || 0, coingeckoPrice);
      }

      const coinpaprikaResponse = await axios
        .get("https://api.coinpaprika.com/v1/tickers/gnus-genius-ai")
        .catch((err) => {
          console.error("CoinPaprika Error:", err);
          return null;
        });

      if (coinpaprikaResponse && coinpaprikaResponse.data) {
        const coinpaprikaPrice =
          coinpaprikaResponse.data?.quotes?.USD?.price || 0;
        const coinpaprikaPercentChange24h =
          coinpaprikaResponse.data?.quotes?.USD?.percent_change_24h || null;
        highestPrice = Math.max(highestPrice || 0, coinpaprikaPrice);
        percentChange24h = coinpaprikaPercentChange24h;
      }

      const gasPrice = await axios
        .get("/api/gas/gasPrice")
        .then((data) => {
          return data.data;
        })
        .catch((err) => {
          console.error("OwlRacle Error:", err);
          return null;
        });

      setPrices({
        price: highestPrice,
        percentChange24h,
        gasPrice: gasPrice,
        error: null,
        updated: new Date().toString(),
      });
    } catch (error) {
      console.error("Error fetching prices:", error);
      setPrices((prevPrices) => ({
        ...prevPrices, // Retain existing data
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  };

  useEffect(() => {
    // Fetch prices initially
    fetchPrices();

    // Fetch prices every 3 minutes
    const interval = setInterval(fetchPrices, 3 * 60 * 1000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  return prices;
};
