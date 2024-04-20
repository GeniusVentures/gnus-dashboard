import { Fragment, useEffect, useState } from "react";
import { Card, Modal, Table } from "react-bootstrap";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import elapsedTime from "functions/time/elapseTime";
import { useRouter } from "next/router";
import Link from "next/link";
import { useIPFSContext } from "context/ipfs/IPFSContext";

const BlockExplorerPreview = () => {
	console.log(useIPFSContext());
	const { blockchainInfo } = useIPFSContext();
	const [parent] = useAutoAnimate();
	const router = useRouter();
	const [modal, setModal] = useState(false);

	return (
		<Fragment>
			<Card style={{ backdropFilter: "blur(5px)" }}>
				<h3 className="text-white text-center mt-3 fs-4">Recent Blocks</h3>
				<Card.Body className="pt-1">
					<Card className="bg-white table-responsive">
						<Table className="mb-0">
							<thead className="">
								<tr className="text-center bg-none">
									<th className="text-primary bg-none">Block</th>
									<th className="text-primary bg-none">Hash</th>
									<th className="text-primary bg-none">Transactions</th>
									<th className="text-primary bg-none">Time</th>
								</tr>
							</thead>
							<tbody ref={parent}>
								{blockchainInfo.map((item, index) => {
									return (
										<tr className="text-center" key={index}>
											<td className="text-primary">
												<Link
													className="text-primary"
													href={`/block/${item.block}`}>
													<u>{item.block}</u>
												</Link>
											</td>
											<td className="text-primary">{item.hash}</td>
											<td className="text-primary">{item.txs}</td>
											<td className="text-primary text-nowrap">
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
					className="p-2"
					type="button"
					onClick={() => {
						setModal(true);
					}}>
					<p className="mb-0 text-white text-center">
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
