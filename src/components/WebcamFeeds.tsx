import React, { useRef, useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { FaCamera, FaStop, FaUpload, FaSpinner } from "react-icons/fa";
import { startWebcam, stopWebcam, handleImageUpload } from "./WebcamFunctions";
import FaceDetectionVisualization from "./FaceDetectionVisualization";




import * as faceapi from "face-api.js";
import {
  FaVideo,
  FaUserCheck,
  FaImage,
  FaUserTag,
  FaUsers,
  FaSmileBeam,
} from "react-icons/fa";

const FACE_COLORS = [
  "#FF5252",
  "#FF4081",
  "#E040FB",
  "#7C4DFF",
  "#536DFE",
  "#448AFF",
  "#40C4FF",
  "#18FFFF",
  "#64FFDA",
  "#69F0AE",
  "#B2FF59",
  "#EEFF41",
];

const WebcamFeeds: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const dispatch = useAppDispatch();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { faces, isWebcamActive } = useAppSelector(
    (state) => state.faceDetection
  );

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(
            "/models/tiny_face_detector"
          ),
          faceapi.nets.faceLandmark68Net.loadFromUri(
            "/models/face_landmark_68"
          ),
          faceapi.nets.faceRecognitionNet.loadFromUri(
            "/models/face_recognition"
          ),
          faceapi.nets.ageGenderNet.loadFromUri("/models/age_gender_model"),
          faceapi.nets.faceExpressionNet.loadFromUri("/models/face_expression"),
        ]);
        console.log("All models loaded");
      } catch (error) {
        console.error("Failed to load models:", error);
      }
    };
    loadModels();
  }, []);

  return (
    <div className="container py-5">
      <div className="row">
        {/* Left Side: Webcam and Controls */}
        <div className="col-12 col-md-6 d-flex flex-column align-items-center">
          <div className="d-flex gap-3 mb-4">
            <button
              className="btn btn-primary d-flex align-items-center gap-2"
              onClick={() => startWebcam(videoRef, dispatch)}
              disabled={isWebcamActive || isProcessing}
            >
              {isProcessing ? (
                <>
                  <FaSpinner className="fa-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <FaCamera />
                  Start Webcam
                </>
              )}
            </button>

            <button
              className="btn btn-danger d-flex align-items-center gap-2"
              onClick={() => stopWebcam(videoRef, dispatch)}
              disabled={!isWebcamActive}
            >
              <FaStop />
              Stop Webcam
            </button>

            <label
              className={`btn btn-secondary d-flex align-items-center gap-2 mb-0 ${
                isProcessing ? "disabled" : ""
              }`}
            >
              {isProcessing ? (
                <>
                  <FaSpinner className="fa-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FaUpload />
                  Upload Image
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  handleImageUpload(e, dispatch, setIsProcessing, canvasRef)
                }
                className="d-none"
                disabled={isProcessing}
              />
            </label>
          </div>

          <div className="position-relative w-100  ">
            <video
              ref={videoRef}
              width="100%"
              height="280"
              autoPlay
              muted
              playsInline
              className="rounded border border-secondary w-100"
              style={{ display: isWebcamActive ? "block" : "none" }}
            />
            <canvas
              ref={canvasRef}
              className="rounded border border-secondary w-100 position-absolute top-0 start-0"
              style={{
                display: isWebcamActive || faces.length > 0 ? "block" : "none",
              }}
            />
            {!isWebcamActive && faces.length === 0 && (
              <div
                className="w-100 h-100 bg-light rounded border border-secondary d-flex align-items-center justify-content-center"
                style={{ height: "480px" }}
              >
                {isProcessing && (
                  <div className="text-center">
                    <FaSpinner className="fa-spin fs-1 mb-3" />
                    <p>Processing image...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Results */}
        <div className="col-12 col-md-6 d-flex flex-column">
          <h2 className="h4 mb-4">
            {isProcessing ? (
              <span className="d-flex align-items-center gap-2">
                <FaSpinner className="fa-spin" />
                Analyzing...
              </span>
            ) : faces.length > 0 ? (
              `Detected Faces (${faces.length})`
            ) : (
              "Detection Results"
            )}
          </h2>

          {isProcessing ? (
            <div className="bg-white p-4 rounded shadow-lg text-center">
              <FaSpinner className="fa-spin fs-1 mb-3" />
              <p>Processing face detection...</p>
              <div className="progress mt-3">
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  style={{ width: "75%" }}
                ></div>
              </div>
            </div>
          ) : faces.length === 0 ? (
            <div
              className="bg-white p-4 rounded shadow-lg"
              style={{
                background:
                  "linear-gradient(to right, #48bb78, #3b82f6, #9333ea)",
                boxShadow: "0 8px 16px rgba(20, 152, 137, 0.15)",
              }}
            >
              <h5 className="text-primary mb-3">
                <i className="fas fa-info-circle me-2"></i> Application Features
              </h5>
              <ul className="list-unstyled text-start text-white">
                <li className="mb-2 d-flex align-items-center">
                  <FaVideo className="text-dark me-2" />
                  Start and stop the <strong>webcam feed</strong> anytime.
                </li>
                <li className="mb-2 d-flex align-items-center">
                  <FaUserCheck className="text-info text-dark me-2" />
                  Perform <strong>facial recognition</strong> on captured
                  images.
                </li>
                <li className="mb-2 d-flex align-items-center">
                  <FaImage className="text-dark me-2" />
                  Display <strong>captured images</strong> with face overlays.
                </li>
                <li className="mb-2 d-flex align-items-center">
                  <FaUserTag className="text-dark me-2" />
                  Show details like <strong>name, age, gender</strong> and more.
                </li>
                <li className="mb-2 d-flex align-items-center">
                  <FaUsers className="text-dark me-2" />
                  Detect and display <strong>multiple faces</strong> in one
                  image.
                </li>
                <li className="mb-2 d-flex align-items-center">
                  <FaSmileBeam className="text-dark me-2" />
                  Analyze <strong>emotions</strong> and expressions of detected
                  faces.
                </li>
              </ul>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3 infos">
              {faces.map((face: any, index) => (
                <div
                  key={index}
                  className="bg-white p-3 rounded shadow"
                  style={{
                    borderLeft: `4px solid ${
                      FACE_COLORS[index % FACE_COLORS.length]
                    }`,
                  }}
                >
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white"
                      style={{
                        backgroundColor:
                          FACE_COLORS[index % FACE_COLORS.length],
                        width: "32px",
                        height: "32px",
                      }}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-grow-1">
                      <div className="row info">
                        <div className="col-6 ">
                          <small className="text-muted">Age</small>
                          <div>{Math.round(face.age)} years</div>
                        </div>
                        <div className="col-6">
                          <small className="text-muted">Gender</small>
                          <div>
                            {face.gender} (
                            {Math.round(face.genderProbability * 100)}%)
                          </div>
                        </div>
                      </div>

                      <div>
                        <small className="text-muted">Emotions</small>
                        <div className="mt-2">
                          {Object.entries(face.expressions)
                            .sort((a, b) => b[1] - a[1])
                            .map(([emotion, value]) => (
                              <div key={emotion} className="mb-1">
                                <div className="d-flex justify-content-between">
                                  <span>{emotion}</span>
                                  <span>
                                    {Math.round((value as number) * 100)}%
                                  </span>
                                </div>
                                <div
                                  className="progress"
                                  style={{ height: "5px" }}
                                >
                                  <div
                                    className="progress-bar"
                                    role="progressbar"
                                    style={{
                                      width: `${Math.round(
                                        (value as number) * 100
                                      )}%`,
                                      backgroundColor:
                                        FACE_COLORS[index % FACE_COLORS.length],
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FaceDetectionVisualization
        videoRef={videoRef}
        canvasRef={canvasRef}
        isWebcamActive={isWebcamActive}
      />
    </div>
  );
};

export default WebcamFeeds;
