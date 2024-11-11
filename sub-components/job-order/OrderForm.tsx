import React, { Fragment, useState, useEffect, useRef } from "react";
import { Form, Row, Button, Modal, Image, Col } from "react-bootstrap";
import { ethers } from "ethers";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import validator from "validator";
import models from "data/orderForm/models";
import { toast } from "react-toastify";
const OrderForm: React.FC = () => {
  const [parent] = useAutoAnimate();
  const web3Signer = useRef(null);
  const web3Address = useRef(null);
  const [showSpinner, setShowSpinner] = useState<boolean>(false);
  const [location, setLocation] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [modelFile, setModelFile] = useState<string>("");
  const [radios, setRadios] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [inputSections, setInputSections] = useState<any[]>([
    {
      image: "",
      blockLength: "",
      blockLineStride: "",
      blockStride: "",
      chunkLineStride: "",
      chunkOffset: "",
      chunkStride: "",
      subchunkHeight: "",
      subchunkWidth: "",
      chunkCount: "",
      channels: "",
    },
  ]);

  useEffect(() => {
    w3getter();
  }, []);

  // Initialize web3
  const w3getter = async () => {
    await (window as any).ethereum.enable();
    let w3p = new ethers.BrowserProvider((window as any).ethereum);
    let signer = await w3p.getSigner();
    web3Signer.current = signer;
    const web3Add = await signer.getAddress();
    web3Address.current = web3Add;
  };

  // Function to add a new input section
  const addInputSection = () => {
    setInputSections([
      ...inputSections,
      {
        image: "",
        blockLength: "",
        blockLineStride: "",
        blockStride: "",
        chunkLineStride: "",
        chunkOffset: "",
        chunkStride: "",
        subchunkHeight: "",
        subchunkWidth: "",
        chunkCount: "",
        channels: "",
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

  const manualSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    const pattern = /^model[\w_]*\.[a-z]{2,4}$/i;
    const pattern2 = /^model[\w_/]*\.[a-z]{2,4}$/i;
    const locationGood = validator.isURL(location);
    const typeGood = models.find((model) => model.value === type);
    const modelFileGood =
      validator.isAscii(modelFile) && pattern.test(modelFile);
    let inputsGood: boolean = false;

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
        blockLength,
        blockLineStride,
        blockStride,
        chunkLineStride,
        chunkOffset,
        chunkStride,
        subchunkHeight,
        subchunkWidth,
        chunkCount,
        channels,
      } = inputSections[i];

      if (!validator.isAscii(image) || !pattern2.test(image)) {
        document.getElementById(`image${i}`).className =
          "form-control is-invalid";
      } else {
        document.getElementById(`image${i}`).className = "form-control";
      }
      if (!validator.isNumeric(blockLength, { no_symbols: true })) {
        document.getElementById(`blockLength${i}`).className =
          "form-control is-invalid";
      } else {
        document.getElementById(`blockLength${i}`).className = "form-control";
      }
      if (!validator.isNumeric(blockLineStride, { no_symbols: true })) {
        document.getElementById(`blockLineStride${i}`).className =
          "form-control is-invalid";
      } else {
        document.getElementById(`blockLineStride${i}`).className =
          "form-control";
      }
      if (!validator.isNumeric(blockStride, { no_symbols: true })) {
        document.getElementById(`blockStride${i}`).className =
          "form-control is-invalid";
      } else {
        document.getElementById(`blockStride${i}`).className = "form-control";
      }
      if (!validator.isNumeric(chunkLineStride, { no_symbols: true })) {
        document.getElementById(`chunkLineStride${i}`).className =
          "form-control is-invalid";
      } else {
        document.getElementById(`chunkLineStride${i}`).className =
          "form-control";
      }
      if (!validator.isNumeric(chunkOffset, { no_symbols: true })) {
        document.getElementById(`chunkOffset${i}`).className =
          "form-control is-invalid";
      } else {
        document.getElementById(`chunkOffset${i}`).className = "form-control";
      }
      if (!validator.isNumeric(chunkStride, { no_symbols: true })) {
        document.getElementById(`chunkStride${i}`).className =
          "form-control is-invalid";
      } else {
        document.getElementById(`chunkStride${i}`).className = "form-control";
      }
      if (!validator.isNumeric(subchunkHeight, { no_symbols: true })) {
        document.getElementById(`subchunkHeight${i}`).className =
          "form-control is-invalid";
      } else {
        document.getElementById(`subchunkHeight${i}`).className =
          "form-control";
      }
      if (!validator.isNumeric(subchunkWidth, { no_symbols: true })) {
        document.getElementById(`subchunkWidth${i}`).className =
          "form-control is-invalid";
      } else {
        document.getElementById(`subchunkWidth${i}`).className = "form-control";
      }
      if (!validator.isNumeric(chunkCount, { no_symbols: true })) {
        document.getElementById(`chunkCount${i}`).className =
          "form-control is-invalid";
      } else {
        document.getElementById(`chunkCount${i}`).className = "form-control";
      }
      if (!validator.isNumeric(channels, { no_symbols: true })) {
        document.getElementById(`channels${i}`).className =
          "form-control is-invalid";
      } else {
        document.getElementById(`channels${i}`).className = "form-control";
      }
    }

    if (locationGood && typeGood !== undefined && modelFileGood && inputsGood) {
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
  };

  return (
    <Fragment>
      <div
        ref={parent}
        style={{ width: "1000px" }}
        className="mt-8 shadow-lg text-white">
        <Form.Group id="radios">
          <Row className="text-center  pt-5">
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
        {radios === "manual" && (
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
                            id={`blockLength${index}`}
                            type="text"
                            placeholder="4860000"
                            value={section.blockLength}
                            onChange={(e: any) =>
                              handleInputChange(e, index, "blockLength")
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="px-md-2">
                        <Form.Group>
                          <Form.Label>Block Line Stride</Form.Label>
                          <Form.Control
                            id={`blockLineStride${index}`}
                            type="text"
                            placeholder="5400"
                            value={section.blockLineStride}
                            onChange={(e: any) =>
                              handleInputChange(e, index, "blockLineStride")
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="px-md-2">
                        <Form.Group>
                          <Form.Label>Block Stride</Form.Label>
                          <Form.Control
                            id={`blockStride${index}`}
                            type="text"
                            placeholder="0"
                            value={section.blockStride}
                            onChange={(e: any) =>
                              handleInputChange(e, index, "blockStride")
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="ps-md-2">
                        <Form.Group>
                          <Form.Label>Chunk Line Stride</Form.Label>
                          <Form.Control
                            id={`chunkLineStride${index}`}
                            type="text"
                            placeholder="5400"
                            value={section.chunkLineStride}
                            onChange={(e: any) =>
                              handleInputChange(e, index, "chunkLineStride")
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
                            id={`chunkOffset${index}`}
                            type="text"
                            placeholder="0"
                            value={section.chunkOffset}
                            onChange={(e: any) =>
                              handleInputChange(e, index, "chunkOffset")
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="px-md-2">
                        <Form.Group>
                          <Form.Label>Chunk Stride</Form.Label>
                          <Form.Control
                            id={`chunkStride${index}`}
                            type="text"
                            placeholder="4320"
                            value={section.chunkStride}
                            onChange={(e: any) =>
                              handleInputChange(e, index, "chunkStride")
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="px-md-2">
                        <Form.Group>
                          <Form.Label>Subchunk Height</Form.Label>
                          <Form.Control
                            id={`subchunkHeight${index}`}
                            type="text"
                            placeholder="5"
                            value={section.subchunkHeight}
                            onChange={(e: any) =>
                              handleInputChange(e, index, "subchunkHeight")
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="px-md-2">
                        <Form.Group>
                          <Form.Label>Subchunk Width</Form.Label>
                          <Form.Control
                            id={`subchunkWidth${index}`}
                            type="text"
                            placeholder="5"
                            value={section.subchunkWidth}
                            onChange={(e: any) =>
                              handleInputChange(e, index, "subchunkWidth")
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="px-md-2">
                        <Form.Group>
                          <Form.Label>Chunk Count</Form.Label>
                          <Form.Control
                            id={`chunkCount${index}`}
                            type="text"
                            placeholder="25"
                            value={section.chunkCount}
                            onChange={(e: any) =>
                              handleInputChange(e, index, "chunkCount")
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
                              handleInputChange(e, index, "channels")
                            }
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Fragment>
                ))}
              </div>
              <div className="d-flex">
                <Image
                  height={25}
                  src="images/icons/add-btn.png"
                  className="btn-add"
                  onClick={addInputSection}
                />
                <p className="ms-2 fs-4 fw-bold">Add Input</p>
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
        {radios === "upload" && (
          <Row>
            <Form onSubmit={fileSubmitHandler}>
              <Form.Group id="file" className="mb-3">
                <div className="mx-md-15 mx-lg-20">
                  <Form.Label className="text-white">Select File</Form.Label>
                  <Form.Control
                    id="fileInput"
                    type="file"
                    onChange={(e: any) => setFile(e.target.files[0])}
                  />
                </div>
              </Form.Group>
              <Row className="justify-content-center mt-5">
                <Button
                  type="submit"
                  style={{
                    backgroundColor: " #00000000",
                    maxWidth: "350px",
                  }}
                  className="btn-gnus py-2 fs-4 w-100">
                  Submit
                </Button>
              </Row>
            </Form>
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
