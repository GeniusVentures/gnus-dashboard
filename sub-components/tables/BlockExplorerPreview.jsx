import { Fragment, useEffect } from "react";
import { Card, Table } from "react-bootstrap";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import elapsedTime from "functions/time/elapseTime";
import { useRouter } from "next/router";
const BlockExplorerPreview = ({ blockData }) => {
  const [parent] = useAutoAnimate();
  const router = useRouter();

  return (
    <Fragment>
      <Card>
        <h3 className="text-white text-center mt-3 display-7">Recent Blocks</h3>
        <Card.Body className="pt-1">
          <Card className="bg-white table-responsive">
            <Table className="mb-0">
              <thead className="">
                <tr className="text-center bg-none">
                  <th className="text-primary bg-none">Block</th>
                  <th className="text-primary bg-none">Proposer</th>
                  <th className="text-primary bg-none">Transactions</th>
                  <th className="text-primary bg-none">Time</th>
                </tr>
              </thead>
              <tbody ref={parent}>
                {blockData
                  .reverse()
                  .slice(0, 9)
                  .map((item, index) => {
                    return (
                      <tr
                        onClick={() => {
                          router.push(`/block/${item.block}`);
                        }}
                        className="text-center cursor-pointer"
                        key={index}
                      >
                        <td className="text-primary">{item.block}</td>
                        <td className="text-primary">{item.proposer}</td>
                        <td className="text-primary">{item.txs}</td>
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
export default BlockExplorerPreview;
