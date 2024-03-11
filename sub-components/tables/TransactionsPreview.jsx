import { Fragment, useEffect } from "react";
import { Card, Table } from "react-bootstrap";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import elapsedTime from "functions/time/elapseTime";
import { useRouter } from "next/router";
const TransactionsPreview = ({ transData }) => {
  const [parent] = useAutoAnimate();
  const router = useRouter();

  return (
    <Fragment>
      <Card>
        <h3 className="text-white text-center mt-3 display-7">
          Recent Transactions
        </h3>
        <Card.Body className="pt-1">
          <Card className="bg-white table-responsive text-nowrap">
            <Table className="mb-0">
              <thead className="">
                <tr className="text-center bg-none">
                  <th className="text-primary bg-none">TX Hash</th>
                  <th className="text-primary bg-none">Type</th>
                  <th className="text-primary bg-none">Value</th>
                  <th className="text-primary bg-none">Time</th>
                </tr>
              </thead>
              <tbody ref={parent}>
                {transData
                  .reverse()
                  .slice(0, 9)
                  .map((item, index) => {
                    return (
                      <tr
                        onClick={() => {
                          router.push(`/transaction/${item.txHash}`);
                        }}
                        className="text-center cursor-pointer"
                        key={index}
                      >
                        <td className="text-primary">
                          {item.txHash.slice(0, 6) +
                            "..." +
                            item.txHash.slice(-6)}
                        </td>
                        <td className="text-primary">{item.type}</td>
                        <td className="text-primary">{item.value}</td>
                        <td className="text-primary">
                          {elapsedTime(item.time)} ago
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
          </Card>
        </Card.Body>
      </Card>
    </Fragment>
  );
};
export default TransactionsPreview;
