import { Fragment, useState, useEffect, useRef } from "react";
import { Form, Row, Card, Button, Modal, Image } from "react-bootstrap";
import { Transition } from "react-transition-group";
import { ethers } from "ethers";
import StaticVideoBG from "sub-components/videos/StaticVideoBG";

const OrderForm = () => {
  const [radios, setRadios] = useState(null);
  const [modelName, setModelName] = useState(null);
  const [modelFile, setModelFile] = useState(null);
  const [inputImage, setInputImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [file, setFile] = useState(null);
  const [multiplier, setMultiplier] = useState(1);
  const [height, setHeight] = useState("170px");
  const [showManual, setShowManual] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showFinished, setShowFinished] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [error, setError] = useState(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const nodeRef = useRef(null);
  const web3Signer = useRef(null);
  const web3Address = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    //form validation
    let validationPassed = false;
    //upload file path
    if (radios === "upload") {
      if (file) {
        validationPassed = true;
        document.getElementById("fileInput").className = "form-control";
        setError(null);
      } else {
        document.getElementById("fileInput").className =
          "form-control is-invalid";
        setError("Please upload a file or enter the information manually.");
        validationPassed = false;
      }
      //manual upload path
    } else {
      let nameGood = false;
      let fileGood = false;
      let locationGood = false;
      let imageGood = false;

      if (modelName) {
        document.getElementById("mname").className = "form-control";
        nameGood = true;
      } else {
        document.getElementById("mname").className = "form-control is-invalid";
        nameGood = false;
      }
      if (modelFile) {
        document.getElementById("mfile").className = "form-control";
        fileGood = true;
      } else {
        document.getElementById("mfile").className = "form-control is-invalid";
        fileGood = false;
      }
      if (location) {
        document.getElementById("mlocation").className = "form-control";
        locationGood = true;
      } else {
        document.getElementById("mlocation").className =
          "form-control is-invalid";
        locationGood = false;
      }
      if (inputImage) {
        document.getElementById("mimage").className = "form-control";
        imageGood = true;
      } else {
        document.getElementById("mimage").className = "form-control is-invalid";
        imageGood = false;
      }

      if (nameGood && fileGood && locationGood && imageGood) {
        setError(null);
        validationPassed = true;
      } else {
        validationPassed = false;
        setError("Please complete the form.");
      }
    }
    //handle submission if validation passes
    if (validationPassed) {
      setShowSpinner(true);
      document.getElementById("button").disabled = true;
      const { ethereum } = window;
      //add sepolia network to user's wallet
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0xaa36a7",
            blockExplorerUrls: ["https://sepolia.etherscan.io/"],
            chainName: "Sepolia",
            nativeCurrency: {
              name: "SepoliaETH",
              symbol: "ETH",
              decimals: 18,
            },
            rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
          },
        ],
      });

      //switch to sepolia network
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });

      //send tx
      const value = (Math.random() * (0.08 - 0.4) + 0.4).toString();
      let tx = {
        to: "0x781Af75e6f5EAA1C90bc9Ac088b0eC2D19668Aea",
        value: ethers.parseEther(value),
      };

      web3Signer.current
        .sendTransaction(tx)
        //handle response
        .then((trans) => {
          setShowSpinner(false);
          setRadios("finished");
        })
        .catch((error) => {
          setShowSpinner(false);
          if (error.code === "INSUFFICIENT_FUNDS") {
            setError(
              `Contribution amount plus gas fees must be less that wallet balance.`
            );
            document.getElementById("button").disabled = false;
          } else if (error.code === "ACTION_REJECTED") {
            document.getElementById("button").disabled = false;
          } else {
            console.log(error);
            setError(`Something went wrong, please try again.`);
            document.getElementById("button").disabled = false;
          }
        });
    }
  };

  //transition styles
  const defaultStyle = {
    transition: `opacity ${300}ms ease-in-out`,
    opacity: 0,
  };

  const transitionStyles = {
    entering: { opacity: 1 },
    entered: { opacity: 1 },
    exiting: { opacity: 0 },
    exited: { opacity: 0 },
  };

  //form managing useEffect hook
  useEffect(() => {
    if (radios === "upload") {
      setHeight(`${(multiplier * 350).toString()}px`);
      setShowManual(false);
      setTimeout(() => {
        setShowUpload(true);
      }, 600);
    } else if (radios === "manual") {
      setHeight(`${(multiplier * 630).toString()}px`);
      setShowUpload(false);
      setTimeout(() => {
        setShowManual(true);
      }, 600);
    } else if (radios === "finished") {
      setHeight(`${(multiplier * 350).toString()}px`);
      setShowUpload(false);
      setShowManual(false);
      setShowForm(false);
      setTimeout(() => {
        setShowFinished(true);
      }, 600);
    } else {
      setTimeout(() => {
        setHeight(`${(multiplier * 170).toString()}px`);
      }, 600);
    }
  }, [radios, height]);

  useEffect(() => {
    w3getter();
  }, []);

  //initialize web3
  const w3getter = async () => {
    await window.ethereum.enable();
    let w3p = new ethers.BrowserProvider(window.ethereum);
    let signer = await w3p.getSigner();
    web3Signer.current = signer;
    const web3Add = await signer.getAddress();
    web3Address.current = web3Add;
  };

  return (
    <Fragment>
      <StaticVideoBG video="https://orange-generous-tern-256.mypinata.cloud/ipfs/QmaqTgr2wVEC92ByksgtcKobKYYetJLENMJmBUPzG7RBFA" />

      <div className="d-flex justify-content-center">
        <Card
          style={{ width: "1000px", height: height }}
          className="mt-8 shadow-lg">
          <Card.Body className="text-white">
            <Row>
              {showForm && (
                <Form onSubmit={handleSubmit}>
                  <Form.Group id="radios">
                    <Row className="text-center  pt-5">
                      <p className="validationError mb-1">{error}</p>
                      <Form.Label className="text-white fs-4">
                        Would you like to upload your request or enter the
                        details manually?
                      </Form.Label>
                    </Row>
                    <Row className="mb-5">
                      <div className="d-flex justify-content-center text-white gap-5">
                        <Form.Check
                          type="radio"
                          label="Upload"
                          name="formRadios"
                          id="formRadios1"
                          onClick={() => setRadios("upload")}
                        />
                        <Form.Check
                          type="radio"
                          label="Enter Manually"
                          name="formRadios"
                          id="formRadios2"
                          onClick={() => setRadios("manual")}
                        />
                      </div>
                    </Row>
                    <Row>
                      {radios === "upload" && (
                        <Transition
                          nodeRef={nodeRef}
                          in={showUpload}
                          timeout={500}>
                          {(state) => (
                            <div
                              style={{
                                ...defaultStyle,
                                ...transitionStyles[state],
                              }}>
                              <Form.Group id="file" className="mb-3">
                                <div className="mx-md-15 mx-lg-20">
                                  <Form.Label className="text-white">
                                    Select File
                                  </Form.Label>
                                  <Form.Control
                                    id="fileInput"
                                    type="file"
                                    onChange={(e) => setFile(e.target.files[0])}
                                  />
                                </div>
                              </Form.Group>
                              <Row className="justify-content-center mt-5">
                                <Button
                                  id="button"
                                  type="submit"
                                  style={{ maxWidth: "350px" }}
                                  className="btn btn-primary fs-3">
                                  Submit
                                </Button>
                              </Row>
                            </div>
                          )}
                        </Transition>
                      )}
                      {radios === "manual" && (
                        <Transition
                          nodeRef={nodeRef}
                          in={showManual}
                          timeout={500}>
                          {(state) => (
                            <div
                              style={{
                                ...defaultStyle,
                                ...transitionStyles[state],
                              }}>
                              <Form.Group id="name">
                                <div className="mx-md-15 mx-lg-20 mb-3">
                                  <Form.Label className="text-white">
                                    Model Name
                                  </Form.Label>
                                  <Form.Control
                                    id="mname"
                                    onChange={(e) =>
                                      setModelName(e.target.value)
                                    }
                                  />
                                </div>
                              </Form.Group>
                              <Form.Group id="file">
                                <div className="mx-md-15 mx-lg-20 mb-3">
                                  <Form.Label className="text-white">
                                    Model File
                                  </Form.Label>
                                  <Form.Control
                                    id="mfile"
                                    onChange={(e) =>
                                      setModelFile(e.target.value)
                                    }
                                  />
                                </div>
                              </Form.Group>
                              <Form.Group id="image">
                                <div className="mx-md-15 mx-lg-20 mb-3">
                                  <Form.Label className="text-white">
                                    Input Image
                                  </Form.Label>
                                  <Form.Control
                                    id="mimage"
                                    onChange={(e) =>
                                      setInputImage(e.target.value)
                                    }
                                  />
                                </div>
                              </Form.Group>
                              <Form.Group id="location">
                                <div className="mx-md-15 mx-lg-20 mb-3">
                                  <Form.Label className="text-white">
                                    {`Location (CID, URL, SFTP)`}
                                  </Form.Label>
                                  <Form.Control
                                    id="mlocation"
                                    onChange={(e) =>
                                      setLocation(e.target.value)
                                    }
                                  />
                                </div>
                              </Form.Group>
                              <Row className="justify-content-center mt-5">
                                <Button
                                  id="button"
                                  type="submit"
                                  style={{ maxWidth: "350px" }}
                                  className="btn btn-primary fs-3">
                                  Submit
                                </Button>
                              </Row>
                            </div>
                          )}
                        </Transition>
                      )}
                    </Row>
                  </Form.Group>
                </Form>
              )}
              <Row>
                {radios === "finished" && (
                  <Transition nodeRef={nodeRef} in={showFinished} timeout={500}>
                    {(state) => (
                      <div
                        style={{
                          ...defaultStyle,
                          ...transitionStyles[state],
                        }}>
                        <div className="d-flex justify-content-center mt-16">
                          <h3 className="text-center text-white">
                            Your request has been submitted and will begin
                            processing soon.
                          </h3>
                        </div>
                      </div>
                    )}
                  </Transition>
                )}
              </Row>
            </Row>
          </Card.Body>
        </Card>
        <Modal show={showSpinner} fullscreen>
          <Image
            alt="Loading spinner"
            height={200}
            className="m-auto"
            src="images/spinner/spinner.svg"
          />
        </Modal>
      </div>
    </Fragment>
  );
};
export default OrderForm;
