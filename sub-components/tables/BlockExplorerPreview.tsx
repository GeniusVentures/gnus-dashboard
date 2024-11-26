import { Fragment, useEffect, useState } from "react";
import { Card, Modal, Table } from "react-bootstrap";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import elapsedTime from "functions/time/elapseTime";
import { useRouter } from "next/router";
import Link from "next/link";
// import { useIPFSContext } from "context/ipfs/IPFSContext";

const BlockExplorerPreview = ({ blockData }) => {
  // const { blockchainInfo } = useIPFSContext();
  const [parent] = useAutoAnimate();
  const router = useRouter();
  const [modal, setModal] = useState<boolean>(false);

  return (
    <Fragment>
      <Card className="">
        <h3 className="text-white text-center mt-3 fs-4">Recent Blocks</h3>
        <Card.Body className="pt-1">
          <Card className="table-responsive">
            <Table className="mb-0">
              <thead className="">
                <tr className="text-center fs-4">
                  <th>Block</th>
                  <th>Hash</th>
                  <th>Transactions</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody ref={parent}>
                {blockData.slice(0, 9).map(
                  (
                    item: {
                      block: string;
                      hash: string;
                      txs: string;
                      time: string;
                    },
                    index: string
                  ) => {
                    return (
                      <tr className="text-center" key={index}>
                        <td>
                          <Link href={`/block/${item.block}`}>
                            <u>{item.block}</u>
                          </Link>
                        </td>
                        <td>
                          {item.hash?.slice(0, 6) +
                            "..." +
                            item.hash?.slice(-6)}
                        </td>
                        <td>{item.txs}</td>
                        <td className="text-nowrap">
                          {elapsedTime(item.time)} ago
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </Table>
          </Card>
        </Card.Body>
        <Card.Footer
          style={{ cursor: "pointer" }}
          className="p-2"
          onClick={() => {
            setModal(true);
          }}>
          <p className="mb-0 text-white fs-4 text-center">
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
export default BlockExplorerPreview;
