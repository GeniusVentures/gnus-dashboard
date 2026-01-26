export default {
  metadata: {
    name: "GNUS Dashboard",
    description: "GNUS Dashboard",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://dashboard.gnus.ai/job-orders",
    icons: ["images/logo/gnus-icon.png"],
  },
  reown: {
    projectId: process.env.WALLETCONNECT_PROJECT_ID || "",
  },

  amoyContract: process.env.AMOY_CONTRACT || "0xeC20bDf2f9f77dc37Ee8313f719A3cbCFA0CD1eB",
  sepoliaContract: process.env.SEPOLIA_CONTRACT || "0x9af8050220D8C355CA3c6dC00a78B474cd3e3c70",

  networks: {
    sepolia: {
      chainId: 11155111,
      name: "Sepolia",
      rpcUrl: "https://rpc.sepolia.org/",
      currency: "ETH",
      explorerUrl: "https://sepolia.etherscan.io",
    },
    amoy: {
      chainId: 80002,
      name: "Amoy",
      rpcUrl: "https://polygon-amoy.drpc.org/",
      currency: "POL",
      explorerUrl: "https://amoy.polygonscan.com/",
    },
  },
};
