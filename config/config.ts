export default {
  metadata: {
    name: "GNUS Dashboard",
    description: "GNUS Dashboard",
    url: "https://dashboard.gnus.ai/job-orders",
    icons: ["images/logo/gnus-icon.png"],
  },
  reown: {
    projectId: "e708ac0da00e7831cdfd3d97feff279f",
  },

  amoyContract: "0xeC20bDf2f9f77dc37Ee8313f719A3cbCFA0CD1eB",
  sepoliaContract: "0x9af8050220D8C355CA3c6dC00a78B474cd3e3c70",

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
