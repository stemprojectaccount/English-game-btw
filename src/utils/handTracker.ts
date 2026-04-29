import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let handLandmarker: HandLandmarker | null = null;

export const initializeHandTracker = async () => {
    if (handLandmarker) return handLandmarker;

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
    );

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2,
    });

    return handLandmarker;
};
