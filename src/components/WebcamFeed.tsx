import React, { useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setFaces, setWebcamActive } from "../store/faceDetectionSlice";

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
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Webcam/Image Display */}
        <div className="flex-1">
          <div className="flex gap-4 mb-4">
            <button
              className="btn btn-primary"
              onClick={startWebcam}
              disabled={isWebcamActive}
            >
              Start Webcam
            </button>
            <button
              className="btn btn-danger"
              onClick={stopWebcam}
              disabled={!isWebcamActive}
            >
              Stop Webcam
            </button>
            <label className="btn btn-secondary">
              Upload Image
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="relative">
            <video
              ref={videoRef}
              width="640"
              height="480"
              autoPlay
              muted
              playsInline
              className="rounded-lg border-2 border-gray-300 w-full"
              style={{ display: isWebcamActive ? "block" : "none" }}
            />
            <canvas
              ref={canvasRef}
              className="rounded-lg border-2 border-gray-300 w-full absolute top-0 left-0"
              style={{
                display: isWebcamActive || faces.length > 0 ? "block" : "none",
              }}
            />
            {!isWebcamActive && faces.length === 0 && (
              <div className="w-full h-96 bg-gray-100 rounded-lg border-2 border-gray-300 flex items-center justify-center">
                <p className="text-gray-500">
                  Webcam or uploaded image will appear here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-4">
            Detected Faces {faces.length > 0 && `(${faces.length})`}
          </h2>

          {faces.length === 0 ? (
            <div className="bg-gray-100 p-4 rounded-lg">
              <p>No faces detected yet. Start webcam or upload an image.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {faces.map((face: any, index) => (
                <div
                  key={index}
                  className="bg-white p-4 rounded-lg shadow"
                  style={{
                    borderLeft: `4px solid ${
                      FACE_COLORS[index % FACE_COLORS.length]
                    }`,
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="text-white rounded-full w-8 h-8 flex items-center justify-center"
                      style={{
                        backgroundColor:
                          FACE_COLORS[index % FACE_COLORS.length],
                      }}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="font-semibold text-sm text-gray-500">
                            Age
                          </p>
                          <p className="text-lg">
                            {Math.round(face.age)} years
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-500">
                            Gender
                          </p>
                          <p className="text-lg">
                            {face.gender} (
                            {Math.round(face.genderProbability * 100)}%)
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="font-semibold text-sm text-gray-500 mb-2">
                          Emotions
                        </p>
                        <div className="space-y-2">
                          {Object.entries(face.expressions)
                            .sort((a, b) => b[1] - a[1])
                            .map(([emotion, value]) => (
                              <div key={emotion}>
                                <div className="flex justify-between text-sm">
                                  <span className="capitalize">{emotion}</span>
                                  <span>
                                    {Math.round((value as number) * 100)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full"
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
