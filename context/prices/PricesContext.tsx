import React, { createContext, useContext, ReactNode } from "react";
import { usePrices } from "hooks/prices/usePrices"; // Replace with the correct path to your usePrices hook

// Define the context type
interface PricesContextValue {
  price: number | null;
  percentChange24h: number | null;
  gasPrice: number | null;
  error: string | null;
}

// Create the context
const PricesContext = createContext<PricesContextValue | undefined>(undefined);

// Wrapper component
export function PricesWrapper({ children }: { children: ReactNode }) {
  const prices = usePrices(); // Use the custom hook

  return (
    <PricesContext.Provider value={prices}>{children}</PricesContext.Provider>
  );
}

// Custom hook to use the context
export function usePricesContext() {
  const context = useContext(PricesContext);

  if (!context) {
    throw new Error("usePricesContext must be used within a PricesWrapper");
  }

  return context;
}
