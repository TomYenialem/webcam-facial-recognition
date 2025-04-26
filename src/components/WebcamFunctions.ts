import { useAppDispatch } from "../store/hooks";
import { setWebcamActive, setFaces } from "../store/faceDetectionSlice";
import * as faceapi from "face-api.js";

// Color constants for face bounding boxes and annotations
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
] as const;

// Type definition for face detection with age, gender, and expressions
type FaceDetectionWithAllFeatures = faceapi.WithFaceExpressions<
  faceapi.WithAge<
    faceapi.WithGender<
      faceapi.WithFaceLandmarks<
        {
          detection: faceapi.FaceDetection;
        },
        faceapi.FaceLandmarks68
      >
    >
  >
>;

// Start webcam feed
export const startWebcam = async (
  videoRef: React.RefObject<HTMLVideoElement>,
  dispatch: ReturnType<typeof useAppDispatch>
): Promise<void> => {
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
        videoRef.current?.play(); // Ensure video starts playing when metadata is loaded
      };
    }
    dispatch(setWebcamActive(true));
  } catch (error) {
    console.error("Error accessing webcam:", error);
  }
};

// Stop webcam feed
export const stopWebcam = (
  videoRef: React.RefObject<HTMLVideoElement>,
  dispatch: ReturnType<typeof useAppDispatch>
): void => {
  const stream = videoRef.current?.srcObject as MediaStream;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop()); // Stop each track of the stream
  }
  if (videoRef.current) {
    videoRef.current.srcObject = null; // Clear the video source
  }
  dispatch(setWebcamActive(false)); // Update state to reflect webcam inactivity
  dispatch(setFaces([])); // Reset faces detected
};

// Draw enhanced face expressions on the canvas
const drawEnhancedExpressions = (
  canvas: HTMLCanvasElement,
  detection: FaceDetectionWithAllFeatures,
  color: string
): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const expressions = detection.expressions;
  const expressionEntries = Object.entries(expressions) as [string, number][];
  const sortedExpressions = expressionEntries.sort((a, b) => b[1] - a[1]);
  const [dominantExpression, maxProbability] = sortedExpressions[0];

  if (maxProbability > 0.2) {
    faceapi.draw.drawFaceExpressions(canvas, [detection], 0.2); // Draw the expressions

    const box = detection.detection.box;
    ctx.fillStyle = `${color}CC`;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(box.x, box.y - 25, 120, 20, 4); // Draw the expression label background
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

// Handle image upload and process face detection
export const handleImageUpload = async (
  e: React.ChangeEvent<HTMLInputElement>,
  dispatch: ReturnType<typeof useAppDispatch>,
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>,
  canvasRef: React.RefObject<HTMLCanvasElement>
): Promise<void> => {
  if (!e.target.files?.length) return; // Return if no file is selected
  setIsProcessing(true); // Set processing state to true while image is being processed

  const file = e.target.files[0];
  const image = await faceapi.bufferToImage(file); // Convert the file buffer to image

  try {
    // Detect faces and apply face landmarks, age, gender, and expressions
    const detections = (await faceapi
      .detectAllFaces(image, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withAgeAndGender()
      .withFaceExpressions()) as FaceDetectionWithAllFeatures[];

    dispatch(setFaces(detections as unknown as faceapi.FaceDetection[])); // Update the Redux store with detected faces

    const canvas = canvasRef.current;
    if (canvas) {
      const displaySize = { width: image.width, height: image.height };
      faceapi.matchDimensions(canvas, displaySize); // Resize the canvas for the image dimensions
      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before drawing new image
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height); // Draw the image to canvas

        resizedDetections.forEach((detection, index) => {
          const color = FACE_COLORS[index % FACE_COLORS.length];
          const { age, gender, genderProbability } = detection;
          const box = detection.detection.box;

          // Draw face bounding box
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

          // Draw face landmarks and expressions
          faceapi.draw.drawFaceLandmarks(canvas, [detection]);
          drawEnhancedExpressions(canvas, detection, color);

          // Draw information box with age, gender, etc.
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
    setIsProcessing(false); // Reset processing state after completion
  }
};
