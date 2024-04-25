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
			<Card className="bg-white table-responsive text-nowrap">
				<Table className="mb-0">
					<thead>
						<tr className="text-center bg-none">
							<th className="text-primary bg-none">TX Hash</th>
							<th className="text-primary bg-none">Type</th>
							<th className="text-primary bg-none">Result</th>
							<th className="text-primary bg-none">Value</th>
							<th className="text-primary bg-none">Fee</th>
							<th className="text-primary bg-none">Height</th>
							<th className="text-primary bg-none">Time</th>
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
											<Link
												className="text-primary"
												href={`/transaction/${item.txHash}`}>
												<u>
													{item.txHash.slice(0, 6) +
														"..." +
														item.txHash.slice(-6)}
												</u>
											</Link>
										</td>
										<td className="text-primary">{item.type}</td>
										<td className="text-primary">{item.result}</td>
										<td className="text-primary">{item.value}</td>
										<td className="text-primary">{item.fee}</td>{" "}
										<td className="text-primary">
											<Link
												className="text-primary"
												href={`/block/${item.height}`}>
												<u>{item.height}</u>
											</Link>
										</td>
										<td className="text-primary text-nowrap">
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
