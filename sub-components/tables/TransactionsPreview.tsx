import { Fragment, useEffect, useState } from "react";
import { Card, Table, Modal } from "react-bootstrap";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import elapsedTime from "functions/time/elapseTime";
import { useRouter } from "next/router";
import Link from "next/link";
// import { useIPFSContext } from "context/ipfs/IPFSContext";

const TransactionsPreview = ({ transData }) => {
  // const { transactionInfo } = useIPFSContext();
  const [parent] = useAutoAnimate();
  const [modal, setModal] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    console.log(transData);
  }, [transData]);
  return (
    <Fragment>
      <Card className="">
        <h3 className="text-white text-center mt-3 fs-4">
          Recent Transactions
        </h3>
        <Card.Body className="pt-1">
          <Card className="table-responsive text-nowrap">
            <Table className="mb-0">
              <thead className="">
                <tr className="text-center fs-4">
                  <th>TX Hash</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody ref={parent}>
                {transData.slice(0, 9).map((item: any, index: string) => {
                  console.log(elapsedTime(item.time));
                  return (
                    <tr className="text-center" key={index}>
                      <td>
                        <Link href={`/transaction/${item.txHash}`}>
                          <u>
                            {item.txHash?.slice(0, 6) +
                              "..." +
                              item.txHash?.slice(-6)}
                          </u>
                        </Link>
                      </td>
                      <td>{item.type}</td>
                      <td>{item.value}</td>
                      <td className="text-nowrap">
                        {elapsedTime(item.time)} ago
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        </Card.Body>
        <Card.Footer
          style={{ cursor: "pointer" }}
          className="p-2 curser-pointer"
          onClick={() => {
            setModal(true);
          }}>
          <p className="mb-0 fs-4 text-white text-center">
            Expand{" "}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24"
              viewBox="0 -960 960 960"
              width="24"
              fill="currentColor">
              <path d="M200-200v-240h80v160h160v80H200Zm480-320v-160H520v-80h240v240h-80Z" />
            </svg>
          </p>
        </Card.Footer>
      </Card>
      <Modal show={modal} onHide={() => setModal(false)}></Modal>
    </Fragment>
  );
};
export default TransactionsPreview;
