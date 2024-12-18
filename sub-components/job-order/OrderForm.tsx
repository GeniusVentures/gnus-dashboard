import React, { Fragment, useState, useEffect, useRef } from "react";
import { Form, Row, Button, Modal, Image, Col } from "react-bootstrap";
import { ethers } from "ethers";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import validator from "validator";
import models from "data/orderForm/models";
import { toast } from "react-toastify";
import types from "data/orderForm/types";
import {
  useWeb3Modal,
  useWeb3ModalAccount,
  useWeb3ModalEvents,
  useWeb3ModalState,
  useWeb3ModalProvider,
} from "@web3modal/ethers/react";
import config from "config/config";
import Link from "next/link";
import axios from "axios";
const OrderForm: React.FC = () => {
  const [parent] = useAutoAnimate();
  const { open, close } = useWeb3Modal();
  const { walletProvider } = useWeb3ModalProvider();
  const { address, chainId, isConnected } = useWeb3ModalAccount();
  const events = useWeb3ModalEvents();
  const { selectedNetworkId } = useWeb3ModalState();
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [showSpinner, setShowSpinner] = useState<boolean>(false);
  const [location, setLocation] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [modelFile, setModelFile] = useState<string>("");
  const [radios, setRadios] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [inputSections, setInputSections] = useState<any[]>([
    {
      image: "",
      block_len: null,
      block_line_stride: null,
      block_stride: null,
      chunk_line_stride: null,
      chunk_offset: null,
      chunk_stride: null,
      chunk_subchunk_height: null,
      chunk_subchunk_width: null,
      chunk_count: null,
      channels: null,
    },
  ]);
  const [modalStatus, setModalStatus] = useState<string>("");
  const [gnusBal, setGNUSBal] = useState<string>("");
  const tokenAddress = useRef<string | null>(null);
  const pattern = /^[\w_]*\.[a-z]{2,4}$/i;
  const pattern2 = /^[\w_/]*\.[a-z]{2,4}$/i;
  const ERC1155_ABI = [
    "function balanceOf(address account, uint256 id) view returns (uint256)",
    "function bridgeOut(uint256 amount, uint256 id, uint256 destChainID) external",
  ];
  useEffect(() => {
    if (!isConnected) {
      open({ view: "Connect" })
        .then(() => {
          if (
            selectedNetworkId.split(":")[1] !==
            config.networks.amoy.chainId.toString()
          ) {
            open({ view: "Networks" });
          }
        })
        .catch((err) => {
          console.error(err);
          setModalStatus("closed");
        });
    } else {
      if (
        selectedNetworkId.split(":")[1] !==
        config.networks.amoy.chainId.toString()
      ) {
        open({ view: "Networks" });
      }
    }
    setModalStatus("closed");
    tokenAddress.current = config.amoyContract;
  }, []);

  useEffect(() => {
    console.log(address, chainId, isConnected);
  }, [address, chainId, isConnected]);

  useEffect(() => {
    fetchBal();
  }, [walletProvider]);

  useEffect(() => {
    console.log(events.data.event);
    if (events.data.event === "MODAL_OPEN") {
      setModalStatus("open");
      setRadios(null);
    } else if (events.data.event === "MODAL_CLOSE") {
      setModalStatus("closed");
      fetchBal();
    } else if (events.data.event === "CONNECT_SUCCESS") {
      setModalStatus("closed");
      fetchBal();
    }
  }, [events]);

  const fetchBal = async () => {
    if (walletProvider) {
      const ethersProvider = new ethers.BrowserProvider(walletProvider);
      const signerInstance = await ethersProvider.getSigner(); // Fetch the signer
      setSigner(signerInstance);
      const tokenContract = new ethers.Contract(
        tokenAddress.current,
        ERC1155_ABI,
        signerInstance
      );
      const bal = await tokenContract.balanceOf(address, 0);
      setGNUSBal((parseInt(bal) / 10 ** 18).toFixed(2));
    }
  };

  // Function to add a new input section
  const addInputSection = () => {
    setInputSections([
      ...inputSections,
      {
        image: "",
        block_len: null,
        block_line_stride: null,
        block_stride: null,
        chunk_line_stride: null,
        chunk_offset: null,
        chunk_stride: null,
        chunk_subchunk_height: null,
        chunk_subchunk_width: null,
        chunk_count: null,
        channels: null,
      },
    ]);
  };

  // Handle input change for each section
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    field: string
  ) => {
    const newInputSections = [...inputSections];
    newInputSections[index][field] = e.target.value;
    setInputSections(newInputSections);
  };

  const handleInputChangeInt = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    field: string
  ) => {
    if (e.target.value) {
      const newInputSections = [...inputSections];
      newInputSections[index][field] = parseInt(e.target.value);
      setInputSections(newInputSections);
    } else {
      const newInputSections = [...inputSections];
      newInputSections[index][field] = "";
      setInputSections(newInputSections);
    }
  };

  const manualSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    const locationGood = validator.isURL(location);
    const typeGood = models.find((model) => model.value === type);
    const modelFileGood =
      validator.isAscii(modelFile) && pattern.test(modelFile);
    let inputsGood: boolean = false;
    let inputErrors: string[] = [];

    if (!locationGood) {
      document.getElementById("location").className = "form-control is-invalid";
    } else {
      document.getElementById("location").className = "form-control";
    }
    if (typeGood === undefined) {
      document.getElementById("modelType").className = "form-select is-invalid";
    } else {
      document.getElementById("modelType").className = "form-select";
    }
    if (!modelFileGood) {
      console.log("Invalid model file format");
      document.getElementById("modelFile").className =
        "form-control is-invalid";
    } else {
      document.getElementById("modelFile").className = "form-control";
    }

    for (let i = 0; i < inputSections.length; i++) {
      const {
        image,
        block_len,
        block_line_stride,
        block_stride,
        chunk_line_stride,
        chunk_offset,
        chunk_stride,
        chunk_subchunk_height,
        chunk_subchunk_width,
        chunk_count,
        channels,
      } = inputSections[i];

      if (!validator.isAscii(image) || !pattern2.test(image)) {
        document.getElementById(`image${i}`).className =
          "form-control is-invalid";
        inputErrors.push(`image${i}`);
      } else {
        document.getElementById(`image${i}`).className = "form-control";
      }
      if (!validator.isNumeric(block_len.toString(), { no_symbols: true })) {
        document.getElementById(`block_len${i}`).className =
          "form-control is-invalid";
        inputErrors.push(`block_len${i}`);
      } else {
        document.getElementById(`block_len${i}`).className = "form-control";
      }
      if (
        !validator.isNumeric(block_line_stride.toString(), { no_symbols: true })
      ) {
        document.getElementById(`block_line_stride${i}`).className =
          "form-control is-invalid";
        inputErrors.push(`block_line_stride${i}`);
      } else {
        document.getElementById(`block_line_stride${i}`).className =
          "form-control";
      }
      if (!validator.isNumeric(block_stride.toString(), { no_symbols: true })) {
        document.getElementById(`block_stride${i}`).className =
          "form-control is-invalid";
        inputErrors.push(`block_stride${i}`);
      } else {
        document.getElementById(`block_stride${i}`).className = "form-control";
      }
      if (
        !validator.isNumeric(chunk_line_stride.toString(), { no_symbols: true })
      ) {
        document.getElementById(`chunk_line_stride${i}`).className =
          "form-control is-invalid";
        inputErrors.push(`chunk_line_stride${i}`);
      } else {
        document.getElementById(`chunk_line_stride${i}`).className =
          "form-control";
      }
      if (!validator.isNumeric(chunk_offset.toString(), { no_symbols: true })) {
        document.getElementById(`chunk_offset${i}`).className =
          "form-control is-invalid";
        inputErrors.push(`chunk_offset${i}`);
      } else {
        document.getElementById(`chunk_offset${i}`).className = "form-control";
      }
      if (!validator.isNumeric(chunk_stride.toString(), { no_symbols: true })) {
        document.getElementById(`chunk_stride${i}`).className =
          "form-control is-invalid";
        inputErrors.push(`chunk_stride${i}`);
      } else {
        document.getElementById(`chunk_stride${i}`).className = "form-control";
      }
      if (
        !validator.isNumeric(chunk_subchunk_height.toString(), {
          no_symbols: true,
        })
      ) {
        document.getElementById(`chunk_subchunk_height${i}`).className =
          "form-control is-invalid";
        inputErrors.push(`chunk_subchunk_height${i}`);
      } else {
        document.getElementById(`chunk_subchunk_height${i}`).className =
          "form-control";
      }
      if (
        !validator.isNumeric(chunk_subchunk_width.toString(), {
          no_symbols: true,
        })
      ) {
        document.getElementById(`chunk_subchunk_width${i}`).className =
          "form-control is-invalid";
        inputErrors.push(`chunk_subchunk_width${i}`);
      } else {
        document.getElementById(`chunk_subchunk_width${i}`).className =
          "form-control";
      }
      if (!validator.isNumeric(chunk_count.toString(), { no_symbols: true })) {
        document.getElementById(`chunk_count${i}`).className =
          "form-control is-invalid";
        inputErrors.push(`chunk_count${i}`);
      } else {
        document.getElementById(`chunk_count${i}`).className = "form-control";
      }
      if (!validator.isNumeric(channels.toString(), { no_symbols: true })) {
        document.getElementById(`channels${i}`).className =
          "form-control is-invalid";
        inputErrors.push(`channels${i}`);
      } else {
        document.getElementById(`channels${i}`).className = "form-control";
      }
    }
    if (inputErrors.length === 0) {
      inputsGood = true;
    } else {
      inputsGood = false;
    }

    if (locationGood && typeGood !== undefined && modelFileGood && inputsGood) {
      console.log("all good");
      console.log(
        JSON.stringify({
          data: { type: location.split(":")[0], URL: location },
          model: { name: type, file: modelFile },
          inputSections,
        })
      );
      await axios
        .post("/api/processing/getEstimate", {
          jsonRequest: JSON.stringify({
            data: { type: location.split(":")[0], URL: location },
            model: { name: type, file: modelFile },
            input: inputSections,
          }),
        })
        .then(async (response: any) => {
          const tokenContract = new ethers.Contract(
            tokenAddress.current,
            ERC1155_ABI,
            signer
          );
          const destChainID = parseInt("deba5edc0de", 16);
          console.log(response.data, BigInt(response.data * 10 ** 18));
          const tx = await tokenContract
            .bridgeOut(
              BigInt(response.data * 10 ** 18).toString(),
              0,
              destChainID
            )
            .catch((error) => {
              console.log(error);
              toast.error("Payment failed, please try again.", {
                className: "gnus-toast",
                icon: <Image height={30} src="images/logo/gnus-icon-red.png" />,
              });
            });
          if (tx?.hash) {
            toast.success("Payment successful, submitting job now...", {
              className: "gnus-toast",
              icon: <Image height={30} src="images/logo/gnus-icon.png" />,
            });
            console.log("attempting processing");
            await axios
              .post("/api/processing/submitJob", {
                jsonRequest: JSON.stringify({
                  data: { type: location.split(":")[0], url: location },
                  model: { name: type, file: modelFile },
                  input: inputSections,
                }),
              })
              .then(async (response: any) => {
                console.log(response);
                toast.success("Job submitted successfully!", {
                  className: "gnus-toast",
                  icon: <Image height={30} src="images/logo/gnus-icon.png" />,
                });
                fetchBal();
                setSuccess(true);
              })
              .catch((error) => {
                console.error(error);
                toast.error("Failed to submit job, please try again.", {
                  className: "gnus-toast",
                  icon: (
                    <Image height={30} src="images/logo/gnus-icon-red.png" />
                  ),
                });
              });
          }
        })
        .catch((err) => {
          toast.error("Something went wrong, please try again.", {
            className: "gnus-toast",
            icon: <Image height={30} src="images/logo/gnus-icon-red.png" />,
          });
        });
    } else {
      toast.error(
        "Please fill out all required fields with the proper format",
        {
          className: "gnus-toast",
          icon: <Image height={30} src="images/logo/gnus-icon-red.png" />,
        }
      );
    }
  };

  const fileSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();

    if (file) {
      if (
        file.type === "application/json" &&
        file.name.split(".")[1] === "json"
      ) {
        // Create a FileReader to read the contents of the file
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            // Parse the file content as JSON
            const { data, model, input } = JSON.parse(
              event.target.result as string
            );

            const locationGood = validator.isURL(data.URL);
            const typeGood = types.find((type) => type === data.type);
            const modelFileGood =
              validator.isAscii(model.file) && pattern.test(model.file);
            let inputsGood: boolean = false;
            let inputErrors: string[] = [];

            for (let i = 0; i < input.length; i++) {
              const {
                image,
                block_len,
                block_line_stride,
                block_stride,
                chunk_line_stride,
                chunk_offset,
                chunk_stride,
                chunk_subchunk_height,
                chunk_subchunk_width,
                chunk_count,
                channels,
              } = input[i];

              if (!validator.isAscii(image) || !pattern2.test(image)) {
                inputErrors.push(`image${i}`);
              }
              if (
                !validator.isNumeric(block_len.toString(), { no_symbols: true })
              ) {
                inputErrors.push(`block_len${i}`);
              }
              if (
                !validator.isNumeric(block_line_stride.toString(), {
                  no_symbols: true,
                })
              ) {
                inputErrors.push(`block_line_stride${i}`);
              }
              if (
                !validator.isNumeric(block_stride.toString(), {
                  no_symbols: true,
                })
              ) {
                inputErrors.push(`block_stride${i}`);
              }
              if (
                !validator.isNumeric(chunk_line_stride.toString(), {
                  no_symbols: true,
                })
              ) {
                inputErrors.push(`chunk_line_stride${i}`);
              }
              if (
                !validator.isNumeric(chunk_offset.toString(), {
                  no_symbols: true,
                })
              ) {
                inputErrors.push(`chunk_offset${i}`);
              }
              if (
                !validator.isNumeric(chunk_stride.toString(), {
                  no_symbols: true,
                })
              ) {
                inputErrors.push(`chunk_stride${i}`);
              }
              if (
                !validator.isNumeric(chunk_subchunk_height.toString(), {
                  no_symbols: true,
                })
              ) {
                inputErrors.push(`chunk_subchunk_height${i}`);
              }
              if (
                !validator.isNumeric(chunk_subchunk_width.toString(), {
                  no_symbols: true,
                })
              ) {
                inputErrors.push(`chunk_subchunk_width${i}`);
              }
              if (
                !validator.isNumeric(chunk_count.toString(), {
                  no_symbols: true,
                })
              ) {
                inputErrors.push(`chunk_count${i}`);
              }
              if (
                !validator.isNumeric(channels.toString(), { no_symbols: true })
              ) {
                inputErrors.push(`channels${i}`);
              }
            }

            if (inputErrors.length === 0) {
              inputsGood = true;
            } else {
              inputsGood = false;
            }
            if (
              locationGood &&
              typeGood !== undefined &&
              modelFileGood &&
              inputsGood &&
              inputErrors.length === 0
            ) {
              console.log("all good");
              await axios
                .post("/api/processing/getEstimate", {
                  jsonRequest: JSON.stringify({ data, model, input }),
                })
                .then(async (response: any) => {
                  const tokenContract = new ethers.Contract(
                    tokenAddress.current,
                    ERC1155_ABI,
                    signer
                  );
                  const destChainID = parseInt("deba5edc0de", 16);
                  console.log(response.data, BigInt(response.data * 10 ** 18));
                  const tx = await tokenContract
                    .bridgeOut(
                      BigInt(response.data * 10 ** 18).toString(),
                      0,
                      destChainID
                    )
                    .catch((error) => {
                      console.log(error);
                      toast.error("Payment failed, please try again.", {
                        className: "gnus-toast",
                        icon: (
                          <Image
                            height={30}
                            src="images/logo/gnus-icon-red.png"
                          />
                        ),
                      });
                    });
                  if (tx?.hash) {
                    toast.success("Payment successful, submitting job now...", {
                      className: "gnus-toast",
                      icon: (
                        <Image height={30} src="images/logo/gnus-icon.png" />
                      ),
                    });
                    console.log("attempting processing");
                    await axios
                      .post("/api/processing/submitJob", {
                        jsonRequest: JSON.stringify({ data, model, input }),
                      })
                      .then(async (response: any) => {
                        console.log(response);
                        toast.success("Job submitted successfully!", {
                          className: "gnus-toast",
                          icon: (
                            <Image
                              height={30}
                              src="images/logo/gnus-icon.png"
                            />
                          ),
                        });
                        fetchBal();
                        setSuccess(true);
                      })
                      .catch((error) => {
                        console.error(error);
                        toast.error("Failed to submit job, please try again.", {
                          className: "gnus-toast",
                          icon: (
                            <Image
                              height={30}
                              src="images/logo/gnus-icon-red.png"
                            />
                          ),
                        });
                      });
                  }
                })
                .catch((err) => {
                  toast.error("Something went wrong, please try again.", {
                    className: "gnus-toast",
                    icon: (
                      <Image height={30} src="images/logo/gnus-icon-red.png" />
                    ),
                  });
                });
            } else {
              console.error("Invalid JSON file:");
              toast.error("JSON file has invalid format.", {
                className: "gnus-toast",
                icon: <Image height={30} src="images/logo/gnus-icon-red.png" />,
              });
            }
          } catch (error) {
            console.error("Invalid JSON file:", error);
            toast.error("JSON file has invalid format.", {
              className: "gnus-toast",
              icon: <Image height={30} src="images/logo/gnus-icon-red.png" />,
            });
            document.getElementById("fileInput").classList.add("is-invalid");
          }
        };

        // Read the file as text
        reader.readAsText(file);
      } else {
        toast.error("Submitted file must be in JSON format.", {
          className: "gnus-toast",
          icon: <Image height={30} src="images/logo/gnus-icon-red.png" />,
        });
        document.getElementById("fileInput").classList.add("is-invalid");
      }
    } else {
      toast.error("Select a file in JSON format to submit.", {
        className: "gnus-toast",
        icon: <Image height={30} src="images/logo/gnus-icon-red.png" />,
      });
      document.getElementById("fileInput").classList.add("is-invalid");
    }
  };

  return (
    <Fragment>
      <div
        ref={parent}
        style={{ width: "1000px" }}
        className="mt-8 shadow-lg text-white">
        {modalStatus === "closed" && !isConnected && (
          <Row className="justify-content-center">
            <div style={{ width: "350px" }} className="mx-auto mx-sm-0 fs-3">
              <Button
                onClick={() => open()}
                style={{
                  backgroundColor: " #00000000",
                }}
                className="btn-gnus py-2 w-100 text-center">
                Connect Wallet to Continue
              </Button>
            </div>
          </Row>
        )}
        {modalStatus === "closed" && isConnected && !success && (
          <div>
            <Row className="text-center mb-3">
              <span>
                Connected Address:{" "}
                <Link
                  className="text-primary"
                  href=""
                  onClick={() => open({ view: "Account" })}>
                  {address}
                </Link>
              </span>
            </Row>
            <Row className="text-center">
              <p>Your GNUS Balance: {gnusBal}</p>
            </Row>
            <Form.Group
              id="radios"
              onChange={() => {
                setInputSections([
                  {
                    image: "",
                    block_len: null,
                    block_line_stride: null,
                    block_stride: null,
                    chunk_line_stride: null,
                    chunk_offset: null,
                    chunk_stride: null,
                    chunk_subchunk_height: null,
                    chunk_subchunk_width: null,
                    chunk_count: null,
                    channels: null,
                  },
                ]);
                setFile(null);
                setModelFile("");
                setLocation("");
                setType("");
              }}>
              <Row className="text-center">
                <Form.Label className="text-white fs-4">
                  Would you like to upload your request or enter the details
                  manually?
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
            </Form.Group>
          </div>
        )}
        {radios === "manual" && modalStatus === "closed" && !success && (
          <Row>
            <Form onSubmit={manualSubmitHandler}>
              <h3 className="text-white">General Data</h3>
              <Row>
                <Form.Group onChange={(e: any) => setLocation(e.target.value)}>
                  <Form.Label>Model and Data Root Location</Form.Label>
                  <Form.Control
                    id="location"
                    type="text"
                    placeholder="https://..."
                  />
                </Form.Group>
              </Row>
              <Row className="mb-5">
                <Col xs={12} sm={12} md={6} className="pe-md-2">
                  <Form.Group onChange={(e: any) => setType(e.target.value)}>
                    <Form.Label>Model Type</Form.Label>
                    <Form.Select id="modelType">
                      <option className="text-muted bg-black">
                        Select One
                      </option>
                      {models.map((model, index) => {
                        return (
                          <option
                            className="bg-black"
                            key={index}
                            value={model.value}>
                            {model.name}
                          </option>
                        );
                      })}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12} sm={12} md={6} className="ps-md-2">
                  <Form.Group
                    onChange={(e: any) => setModelFile(e.target.value)}>
                    <Form.Label>Model File</Form.Label>
                    <Form.Control
                      id="modelFile"
                      type="text"
                      placeholder="model.mnn"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <h3 className="text-white">Inputs</h3>
              <div ref={parent}>
                {inputSections.map((section, index) => (
                  <Fragment key={index}>
                    <h4 className="text-white">Input {index + 1}</h4>
                    <Row>
                      <Col xs={12} sm={12} md={4} className="pe-md-2">
                        <Form.Group>
                          <Form.Label>Image/Data</Form.Label>
                          <Form.Control
                            id={`image${index}`}
                            type="text"
                            placeholder="data/ballet.data"
                            value={section.image}
                            onChange={(e: any) =>
                              handleInputChange(e, index, "image")
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="px-md-2">
                        <Form.Group>
                          <Form.Label>Block Length</Form.Label>
                          <Form.Control
                            id={`block_len${index}`}
                            type="text"
                            placeholder="4860000"
                            value={section.block_len}
                            onChange={(e: any) => {
                              console.log(e);
                              {
                                handleInputChangeInt(e, index, "block_len");
                              }
                            }}
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="px-md-2">
                        <Form.Group>
                          <Form.Label>Block Line Stride</Form.Label>
                          <Form.Control
                            id={`block_line_stride${index}`}
                            type="text"
                            placeholder="5400"
                            value={section.block_line_stride}
                            onChange={(e: any) =>
                              handleInputChangeInt(
                                e,
                                index,
                                "block_line_stride"
                              )
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="px-md-2">
                        <Form.Group>
                          <Form.Label>Block Stride</Form.Label>
                          <Form.Control
                            id={`block_stride${index}`}
                            type="text"
                            placeholder="0"
                            value={section.block_stride}
                            onChange={(e: any) =>
                              handleInputChangeInt(e, index, "block_stride")
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="ps-md-2">
                        <Form.Group>
                          <Form.Label>Chunk Line Stride</Form.Label>
                          <Form.Control
                            id={`chunk_line_stride${index}`}
                            type="text"
                            placeholder="5400"
                            value={section.chunk_line_stride}
                            onChange={(e: any) =>
                              handleInputChangeInt(
                                e,
                                index,
                                "chunk_line_stride"
                              )
                            }
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col xs={12} sm={12} md={2} className="pe-md-2">
                        <Form.Group>
                          <Form.Label>Chunk Offset</Form.Label>
                          <Form.Control
                            id={`chunk_offset${index}`}
                            type="text"
                            placeholder="0"
                            value={section.chunk_offset}
                            onChange={(e: any) =>
                              handleInputChangeInt(e, index, "chunk_offset")
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="px-md-2">
                        <Form.Group>
                          <Form.Label>Chunk Stride</Form.Label>
                          <Form.Control
                            id={`chunk_stride${index}`}
                            type="text"
                            placeholder="4320"
                            value={section.chunk_stride}
                            onChange={(e: any) =>
                              handleInputChangeInt(e, index, "chunk_stride")
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="px-md-2">
                        <Form.Group>
                          <Form.Label>Subchunk Height</Form.Label>
                          <Form.Control
                            id={`chunk_subchunk_height${index}`}
                            type="text"
                            placeholder="5"
                            value={section.chunk_subchunk_height}
                            onChange={(e: any) =>
                              handleInputChangeInt(
                                e,
                                index,
                                "chunk_subchunk_height"
                              )
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="px-md-2">
                        <Form.Group>
                          <Form.Label>Subchunk Width</Form.Label>
                          <Form.Control
                            id={`chunk_subchunk_width${index}`}
                            type="text"
                            placeholder="5"
                            value={section.chunk_subchunk_width}
                            onChange={(e: any) =>
                              handleInputChangeInt(
                                e,
                                index,
                                "chunk_subchunk_width"
                              )
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="px-md-2">
                        <Form.Group>
                          <Form.Label>Chunk Count</Form.Label>
                          <Form.Control
                            id={`chunk_count${index}`}
                            type="text"
                            placeholder="25"
                            value={section.chunk_count}
                            onChange={(e: any) =>
                              handleInputChangeInt(e, index, "chunk_count")
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="ps-md-2">
                        <Form.Group>
                          <Form.Label>Channels</Form.Label>
                          <Form.Control
                            id={`channels${index}`}
                            type="text"
                            placeholder="4"
                            value={section.channels}
                            onChange={(e: any) =>
                              handleInputChangeInt(e, index, "channels")
                            }
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <div className="d-flex justify-content-between">
                      {inputSections.length === index + 1 ? (
                        <div className="d-flex">
                          <Image
                            height={25}
                            src="images/icons/add-btn.png"
                            className="btn-add"
                            onClick={addInputSection}
                          />
                          <p className="ms-2 fs-4 fw-bold">Add Input</p>
                        </div>
                      ) : (
                        <div></div>
                      )}
                      {inputSections.length > 1 ? (
                        <div className="d-flex">
                          <Image
                            height={25}
                            src="images/icons/remove-btn.png"
                            className="btn-add"
                            onClick={() => {
                              setInputSections((prevItems) =>
                                prevItems.filter(
                                  (_, index1) => index1 !== index
                                )
                              );
                            }}
                          />
                          <p className="ms-2 fs-4 fw-bold">Remove Input</p>
                        </div>
                      ) : (
                        <div></div>
                      )}
                    </div>
                  </Fragment>
                ))}
              </div>

              <Row className="justify-content-center mt-5">
                <div style={{ width: "250px" }} className="mx-auto mx-sm-0">
                  <Button
                    type="submit"
                    style={{
                      backgroundColor: " #00000000",
                    }}
                    className="btn-gnus py-2 w-100 fs-4">
                    Submit
                  </Button>
                </div>
              </Row>
            </Form>
          </Row>
        )}
        {radios === "upload" && !success && (
          <Row>
            <Form onSubmit={fileSubmitHandler}>
              <Form.Group id="file" className="mb-3">
                <div className="mx-md-15 mx-lg-20">
                  <Form.Label className="text-white">Select File</Form.Label>
                  <Form.Control
                    id="fileInput"
                    type="file"
                    onChange={(e: any) => {
                      setFile(e.target.files[0]);
                      document
                        .getElementById("fileInput")
                        .classList.remove("is-invalid");
                    }}
                  />
                </div>
              </Form.Group>
              <Row className="justify-content-center mt-5">
                <Button
                  type="submit"
                  style={{
                    maxWidth: "350px",
                  }}
                  className="btn-gnus py-2 fs-4 w-100">
                  Submit
                </Button>
              </Row>
            </Form>
          </Row>
        )}
        {success && (
          <Row>
            <p className="text-center fs-4 fw-bold mb-10">
              Your job was successfully submitted.
            </p>
            <Button
              onClick={() => {
                setRadios(null);
                setSuccess(false);
              }}
              style={{
                maxWidth: "350px",
              }}
              className="btn-gnus py-2 fs-4 w-100 mx-auto">
              Submit Another Request
            </Button>
          </Row>
        )}
      </div>
      <Modal show={showSpinner} fullscreen>
        <Image
          alt="Loading spinner"
          height={200}
          className="m-auto"
          src="images/spinner/spinner.svg"
        />
      </Modal>
    </Fragment>
  );
};

export default OrderForm;
