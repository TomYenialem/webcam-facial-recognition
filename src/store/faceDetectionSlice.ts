import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FaceDetection } from "face-api.js";

interface FaceDetectionState {
  faces: FaceDetection[];
  isLoading: boolean;
  error: string | null;
  isWebcamActive: boolean;
}

const initialState: FaceDetectionState = {
  faces: [],
  isLoading: false,
  error: null,
  isWebcamActive: false,
};

const faceDetectionSlice = createSlice({
  name: "faceDetection",
  initialState,
  reducers: {
    setFaces(state, action: PayloadAction<FaceDetection[]>) {
      state.faces = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setWebcamActive(state, action: PayloadAction<boolean>) {
      state.isWebcamActive = action.payload;
    },
  },
});

export const { setFaces, setLoading, setError, setWebcamActive } =
  faceDetectionSlice.actions;
export default faceDetectionSlice.reducer;
