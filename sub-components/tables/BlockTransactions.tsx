import { Fragment, useEffect } from "react";
import { Card, Table } from "react-bootstrap";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import elapsedTime from "functions/time/elapseTime";
import { useRouter } from "next/router";
import Link from "next/link";

const BlockTransactions = ({ transData }) => {
  const [parent] = useAutoAnimate();
  const router = useRouter();

  return (
    <Fragment>
      <Card className="table-responsive text-nowrap">
        <Table className="mb-0">
          <thead>
            <tr className="text-center">
              <th>TX Hash</th>
              <th>Type</th>
              <th>Result</th>
              <th>Value</th>
              <th>Fee</th>
              <th>Height</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody ref={parent}>
            {transData
              .reverse()
              .slice(0, 9)
              .map((item, index) => {
                return (
                  <tr className="text-center cursor-pointer" key={index}>
                    <td>
                      <Link href={`/transaction/${item.txHash}`}>
                        <u>
                          {item.txHash.slice(0, 6) +
                            "..." +
                            item.txHash.slice(-6)}
                        </u>
                      </Link>
                    </td>
                    <td>{item.type}</td>
                    <td>{item.result}</td>
                    <td>{item.value}</td>
                    <td>{item.fee}</td>{" "}
                    <td>
                      <Link href={`/block/${item.height}`}>
                        <u>{item.height}</u>
                      </Link>
                    </td>
                    <td className="text-nowrap">
                      {elapsedTime(item.time)} ago
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </Table>
      </Card>
    </Fragment>
  );
};
export default BlockTransactions;
