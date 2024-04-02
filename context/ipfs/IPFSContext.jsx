import { createContext, useContext } from "react";
import useIPFS from "hooks/ipfs/useIPFS";

const IPFSContext = createContext();

export function IPFSWrapper({ children }) {
  const ipfs = useIPFS();

  return <IPFSContext.Provider value={ipfs}>{children}</IPFSContext.Provider>;
}
export function useIPFSContext() {
  return useContext(IPFSContext);
}
