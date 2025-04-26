import { useAppDispatch } from "../store/hooks";
import { setWebcamActive, setFaces } from "../store/faceDetectionSlice";
import * as faceapi from "face-api.js";

export const FACE_COLORS = [
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

export const startWebcam = async (
  videoRef: React.RefObject<HTMLVideoElement>,
  dispatch: ReturnType<typeof useAppDispatch>
) => {
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
        if (videoRef.current) {
          const canvas = document.createElement("canvas");
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
        }
      };
    }
    dispatch(setWebcamActive(true));
  } catch (error) {
    console.error("Error accessing webcam:", error);
  }
};

export const stopWebcam = (
  videoRef: React.RefObject<HTMLVideoElement>,
  dispatch: ReturnType<typeof useAppDispatch>
) => {
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

const drawEnhancedExpressions = (
  canvas: HTMLCanvasElement,
  detection: faceapi.WithFaceExpressions<
    faceapi.WithFaceLandmarks<
      {
        detection: faceapi.FaceDetection;
      },
      faceapi.FaceLandmarks68
    >
  >,
  color: string
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Enhanced expression drawing
  const expressions = detection.expressions;
  const maxProbability = Math.max(...Object.values(expressions));
  const dominantExpression = Object.entries(expressions).reduce((a, b) =>
    a[1] > b[1] ? a : b
  )[0];

  // Only draw if confidence is high enough
  if (maxProbability > 0.2) {
    faceapi.draw.drawFaceExpressions(canvas, [detection], {
      primaryColor: color,
      secondaryColor: color,
      lineWidth: 3,
      minConfidence: 0.2,
      opacity: 0.9,
    });

    // Draw dominant expression label
    const box = detection.detection.box;
    ctx.fillStyle = `${color}CC`;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(box.x, box.y - 25, 120, 20, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font = "bold 12px Arial";
    ctx.fillText(
      `${dominantExpression} (${Math.round(maxProbability * 100)}%)`,
      box.x + 5,
      box.y - 10
    );
  }
};

export const handleImageUpload = async (
  e: React.ChangeEvent<HTMLInputElement>,
  dispatch: ReturnType<typeof useAppDispatch>,
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>,
  canvasRef: React.RefObject<HTMLCanvasElement>
) => {
  if (!e.target.files?.length) return;
  setIsProcessing(true);

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
      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        resizedDetections.forEach((detection, index) => {
          const color = FACE_COLORS[index % FACE_COLORS.length];
          const { age, gender, genderProbability } = detection as any;
          const box = detection.detection.box;

          // Draw face box
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
          faceapi.draw.drawFaceLandmarks(canvas, [detection], {
            lineWidth: 1,
            color: color,
            drawLines: true,
            drawPoints: true,
          });

          // Draw expressions with enhanced visibility
          drawEnhancedExpressions(canvas, detection, color);

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

          // Draw confidence indicator
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
  } finally {
    setIsProcessing(false);
  }
};
