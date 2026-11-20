/** The AI-image detector used for assessments. Shared by the admin browser runner and scripts/detect-images.mjs. */
export const DETECTOR = {
  model: "onnx-community/SMOGY-Ai-images-detector-ONNX",
  dtype: "q4",
  provider: "smogy-swin-onnx",
  license: "CC BY-NC 4.0",
  /** Probability above which the image is marked "AI indicators". Uncalibrated. */
  threshold: 0.8,
} as const;
