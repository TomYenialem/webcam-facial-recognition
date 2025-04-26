import { configureStore } from '@reduxjs/toolkit';
import faceDetectionReducer from "./faceDetectionSlice";


export const store=configureStore({
    reducer:{
        faceDetection:faceDetectionReducer
    },
})
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;



