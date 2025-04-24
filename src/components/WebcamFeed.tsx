import React, { useRef, useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

const WebcamFeed: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [model, setModel] = useState<any>(null);
  const [faces, setFaces] = useState<any[]>([]);
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);

  useEffect(() => {
    const loadModel = async () => {
      const loadedModel = await blazeface.load();
      setModel(loadedModel);
    };

    loadModel();

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isWebcamActive && model && videoRef.current) {
      const detectFaces = async () => {
        const video = videoRef.current;
        const predictions = await model.estimateFaces(video, false);
        setFaces(predictions);
      };

      const interval = setInterval(() => {
        detectFaces();
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isWebcamActive, model]);

  const startWebcam = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    setIsWebcamActive(true);
  };

  const stopWebcam = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    const tracks = stream.getTracks();
    tracks.forEach((track) => track.stop());
    setIsWebcamActive(false);
  };

  return (
    <div className="webcam-container">
      <div className="text-center mb-3">
        <button
          className="btn btn-primary"
          onClick={startWebcam}
          disabled={isWebcamActive}
        >
          Start Webcam
        </button>
        <button
          className="btn btn-danger ml-2"
          onClick={stopWebcam}
          disabled={!isWebcamActive}
        >
          Stop Webcam
        </button>
      </div>
      <div className="position-relative">
        <video
          ref={videoRef}
          width="100%"
          height="auto"
          autoPlay
          playsInline
          muted
        />
        {faces.length > 0 &&
          faces.map((face, index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                top: face.topLeft[1],
                left: face.topLeft[0],
                width: face.bottomRight[0] - face.topLeft[0],
                height: face.bottomRight[1] - face.topLeft[1],
                border: "2px solid red",
              }}
            >
              {/* Add any additional face information here */}
            </div>
          ))}
      </div>
    </div>
  );
};

export default WebcamFeed;
