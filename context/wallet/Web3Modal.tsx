"use client";

import { createWeb3Modal, defaultConfig } from "@web3modal/ethers/react";
import config from "config/config";

const { reown, metadata, networks } = config;
// 1. Get projectId from https://cloud.walletconnect.com
const projectId = reown.projectId;

// 4. Create Ethers config
const ethersConfig = defaultConfig({
  /*Required*/
  metadata,
});

// 5. Create a Web3Modal instance
createWeb3Modal({
  chains: [networks.amoy],
  ethersConfig,
  enableOnramp: false,
  enableSwaps: false,
  defaultChain: networks.amoy,
  projectId,
  themeVariables: {
    "--w3m-color-mix": "#00000090",
    "--w3m-color-mix-strength": 30,
    "--w3m-accent": "#36edb5",
  },
});

export function Web3Modal({ children }) {
  return children;
}
