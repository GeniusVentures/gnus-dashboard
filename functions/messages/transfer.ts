import { updateTD, transactionData } from "data/prepared/transactionInfo";

let keys: string[] = [];

const transferMsg = (transfer: any) => {
    let transaction = {
      txHash: String.fromCharCode(...transfer.dagStruct.dataHash), //previous hash until we have actual hash
      type: "Transfer",
      value: String.fromCharCode(...transfer.encryptedAmount),
      time: transfer.dagStruct.timestamp.toString(),
    };

    updateTD([transaction, ...transactionData].slice(0, 200));
};

export default transferMsg;
