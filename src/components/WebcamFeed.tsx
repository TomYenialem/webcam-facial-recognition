import React, { useRef, useEffect ,useState} from "react";
import * as faceapi from "face-api.js";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setFaces, setWebcamActive } from "../store/faceDetectionSlice";
import { FaCamera, FaStop, FaUpload, FaSpinner } from "react-icons/fa"; 

import {
  FaVideo,
  FaUserCheck,
  FaImage,
  FaUserTag,
  FaUsers,
  FaSmileBeam,
} from "react-icons/fa";

// Color palette for different faces
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

const WebcamFeed: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dispatch = useAppDispatch();
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

  // Enhanced face detection with visual overlays
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const detectFaces = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      try {
        // Detect faces with enhanced options
        const detections = await faceapi
          .detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 512,
              scoreThreshold: 0.5,
            })
          )
          .withFaceLandmarks()
          .withAgeAndGender()
          .withFaceExpressions();

        dispatch(setFaces(detections));

        // Set canvas dimensions to match video
        const displaySize = {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        };
        faceapi.matchDimensions(canvasRef.current, displaySize);
        const resizedDetections = faceapi.resizeResults(
          detections,
          displaySize
        );

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Clear and draw the current video frame
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          // Draw visual indicators for each face
          resizedDetections.forEach((detection, index) => {
            const color = FACE_COLORS[index % FACE_COLORS.length];
            const { age, gender, genderProbability, expressions } =
              detection as any;
            const box = detection.detection.box;

            // 1. Draw enhanced bounding box with shadow
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(box.x, box.y, box.width, box.height, 8);
            ctx.stroke();

            // Semi-transparent fill
            ctx.fillStyle = `${color}20`;
            ctx.fill();
            ctx.restore();

            // 2. Draw facial landmarks
            faceapi.draw.drawFaceLandmarks(canvas, [detection], {
              lineWidth: 1,
              color: color,
              drawLines: true,
              drawPoints: true,
            });

            // 3. Draw face expressions
            faceapi.draw.drawFaceExpressions(canvas, [detection], {
              primaryColor: color,
              secondaryColor: "#FFFFFF",
              minConfidence: 0.1,
            });

            // 4. Draw comprehensive info overlay
            const dominantExpression = Object.entries(expressions).sort(
              (a, b) => b[1] - a[1]
            )[0][0];

            // Create info box
            const infoBoxWidth = 180;
            const infoBoxHeight = 80;
            const infoBoxX = Math.max(10, box.x);
            const infoBoxY = box.y - infoBoxHeight - 10;

            // Draw info box background
            ctx.save();
            ctx.fillStyle = `${color}CC`;
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, 5);
            ctx.fill();
            ctx.stroke();

            // Draw info text
            ctx.fillStyle = "white";
            ctx.font = "bold 14px Arial";
            ctx.fillText(`Face ${index + 1}`, infoBoxX + 10, infoBoxY + 20);
            ctx.font = "12px Arial";
            ctx.fillText(
              `Age: ${Math.round(age)}`,
              infoBoxX + 10,
              infoBoxY + 40
            );
            ctx.fillText(
              `${gender} (${Math.round(genderProbability * 100)}%)`,
              infoBoxX + 10,
              infoBoxY + 60
            );
            ctx.restore();

            // 5. Draw detection confidence indicator
            ctx.fillStyle = `${color}AA`;
            ctx.fillRect(
              box.x,
              box.y - 8,
              box.width * detection.detection.score,
              4
            );
          });
        }
      } catch (error) {
        console.error("Error detecting faces:", error);
      }
    
    };

    if (isWebcamActive) {
      interval = setInterval(detectFaces, 300);
    }

    return () => clearInterval(interval);
  }, [isWebcamActive, dispatch]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current && canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
        };
      }
      dispatch(setWebcamActive(true));
    } catch (error) {
      console.error("Error accessing webcam:", error);
    }
  };

  const stopWebcam = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    dispatch(setWebcamActive(false));
    dispatch(setFaces([]));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    if (isProcessing) return; // Prevent multiple uploads at once
    setIsProcessing(true); // Set processing state

    const file = e.target.files[0];
    const image = await faceapi.bufferToImage(file);

    try {
      const detections = await faceapi
        .detectAllFaces(image, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withAgeAndGender()
        .withFaceExpressions();

      dispatch(setFaces(detections));

      const canvas = canvasRef.current;
      if (canvas) {
        const displaySize = { width: image.width, height: image.height };
        faceapi.matchDimensions(canvas, displaySize);
        const resizedDetections = faceapi.resizeResults(
          detections,
          displaySize
        );

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

          resizedDetections.forEach((detection, index) => {
            const color = FACE_COLORS[index % FACE_COLORS.length];
            const { age, gender, genderProbability, expressions } =
              detection as any;
            const box = detection.detection.box;

            // Draw enhanced visual indicators (same as webcam version)
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(box.x, box.y, box.width, box.height, 8);
            ctx.stroke();
            ctx.fillStyle = `${color}20`;
            ctx.fill();
            ctx.restore();

            faceapi.draw.drawFaceLandmarks(canvas, [detection], {
              lineWidth: 1,
              color: color,
              drawLines: true,
              drawPoints: true,
            });

            faceapi.draw.drawFaceExpressions(canvas, [detection], {
              primaryColor: color,
              secondaryColor: "#FFFFFF",
              minConfidence: 0.1,
            });

            // Info box
            const dominantExpression = Object.entries(expressions).sort(
              (a, b) => b[1] - a[1]
            )[0][0];

            const infoBoxWidth = 180;
            const infoBoxHeight = 80;
            const infoBoxX = Math.max(10, box.x);
            const infoBoxY = box.y - infoBoxHeight - 10;

            ctx.save();
            ctx.fillStyle = `${color}CC`;
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, 5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "white";
            ctx.font = "bold 14px Arial";
            ctx.fillText(`Face ${index + 1}`, infoBoxX + 10, infoBoxY + 20);
            ctx.font = "12px Arial";
            ctx.fillText(
              `Age: ${Math.round(age)}`,
              infoBoxX + 10,
              infoBoxY + 40
            );
            ctx.fillText(
              `${gender} (${Math.round(genderProbability * 100)}%)`,
              infoBoxX + 10,
              infoBoxY + 60
            );
            ctx.restore();

            ctx.fillStyle = `${color}AA`;
            ctx.fillRect(
              box.x,
              box.y - 8,
              box.width * detection.detection.score,
              4
            );
          });
        }
      }
    } catch (error) {
      console.error("Error processing image:", error);
    }
    finally {
      setIsProcessing(false); // Reset processing state
    }
    
  };

  return (
    <div className="container py-5">
      <div className="row">
        {/* Left Side: Webcam and Controls */}
        <div className="col-12 col-md-6 d-flex flex-column align-items-center">
          <div className="d-flex gap-3 mb-4">
            <button
              className="btn btn-primary d-flex align-items-center gap-2"
              onClick={startWebcam}
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
              onClick={stopWebcam}
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
                onChange={handleImageUpload}
                className="d-none"
                disabled={isProcessing}
              />
            </label>
          </div>

          <div className="position-relative w-100">
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
                ) }
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
            <div className="d-flex flex-column gap-3">
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
                      <div className="row mb-2">
                        <div className="col-6">
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
    </div>
  );
};

export default WebcamFeed;
