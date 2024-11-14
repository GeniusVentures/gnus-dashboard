import { updateED, escrowData } from "../../data/prepared/escrowInfo";

let keys: string[] = [];

const escrowMsg = (escrow: any) => {
    let msg = {
      txHash: String.fromCharCode(...escrow.dagStruct.dataHash),
      type: "Escrow",
      value: String.fromCharCode(...escrow.encryptedAmount),
      time: escrow.dagStruct.timestamp.toString(),
      nonce: escrow.dagStruct.nonce.toString(),
      source: escrow.dagStruct.sourceAddr.toString(),
    };

    updateED([msg, ...escrowData].slice(0, 200));
  
};

export default escrowMsg;
