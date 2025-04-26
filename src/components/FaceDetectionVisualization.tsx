import React, { useEffect } from "react";
import * as faceapi from "face-api.js";
import { useAppDispatch } from "../store/hooks";
import { setFaces } from "../store/faceDetectionSlice";

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

interface FaceDetectionVisualizationProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isWebcamActive: boolean;
}

interface ExtendedFaceDetection
  extends faceapi.WithFaceExpressions<
    faceapi.WithAge<
      faceapi.WithGender<
        faceapi.WithFaceLandmarks<
          { detection: faceapi.FaceDetection },
          faceapi.FaceLandmarks68
        >
      >
    >
  > {}

const FaceDetectionVisualization: React.FC<FaceDetectionVisualizationProps> = ({
  videoRef,
  canvasRef,
  isWebcamActive,
}) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const detectFaces = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      try {
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

        // Only dispatch the FaceDetections, not full ExtendedFaceDetections
        dispatch(setFaces(detections.map((det) => det.detection)));

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
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        resizedDetections.forEach((detection, index) => {
          const color = FACE_COLORS[index % FACE_COLORS.length];
          const { box, score } = detection.detection;
          const {
            expressions,
            age = 0,
            gender = "unknown",
            genderProbability = 0,
          } = detection;

          // Draw bounding box
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

          // Draw landmarks
          faceapi.draw.drawFaceLandmarks(canvas, [detection]);

          // Draw expressions
          faceapi.draw.drawFaceExpressions(canvas, [detection]);

          // Get dominant expression
          const dominantExpression = Object.entries(expressions).sort(
            (a, b) => (b[1] as number) - (a[1] as number)
          )[0][0];

          // Draw info box
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
          ctx.fillText(`Age: ${Math.round(age)}`, infoBoxX + 10, infoBoxY + 40);
          ctx.fillText(
            `${gender} (${Math.round(genderProbability * 100)}%)`,
            infoBoxX + 10,
            infoBoxY + 60
          );
          ctx.restore();

          // Draw confidence bar
          ctx.fillStyle = `${color}AA`;
          ctx.fillRect(box.x, box.y - 8, box.width * score, 4);
        });
      } catch (error) {
        console.error("Error detecting faces:", error);
      }
    };

    if (isWebcamActive) {
      interval = setInterval(detectFaces, 300);
    }

    return () => clearInterval(interval);
  }, [isWebcamActive, dispatch, videoRef, canvasRef]);

  return null;
};

export default FaceDetectionVisualization;
