import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-alpha.19/dist/transformers.min.js";

// Configure local environments
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

let transcriber = null;

async function getTranscriber(modelName, device, dtype, onProgress) {
  if (transcriber) return transcriber;

  self.postMessage({
    status: "loading",
    message: "Initializing pipeline... جاري تهيئة بيئة العمل المحلي"
  });

  transcriber = await pipeline("automatic-speech-recognition", modelName, {
    device: device || "webgpu",
    dtype: dtype || "fp32",
    progress_callback: (data) => {
      if (data.status === "progress") {
        self.postMessage({
          status: "progress",
          file: data.file,
          progress: Math.round(data.progress)
        });
      }
    }
  });
  return transcriber;
}

self.onmessage = async (event) => {
  const { type, audioData, modelName, device, dtype, options } = event.data;

  if (type === "transcribe") {
    try {
      self.postMessage({
        status: "loading_model",
        message: "Loading AI model layers... جاري تحميل طبقات النموذج الذكي"
      });

      const pipe = await getTranscriber(modelName, device, dtype);

      self.postMessage({
        status: "processing_audio",
        message: "AI is analyzing & transcribing... جاري المعالجة والتفريغ الذكي"
      });

      const response = await pipe(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        ...options
      });

      self.postMessage({
        status: "success",
        result: response
      });
    } catch (error) {
      self.postMessage({
        status: "error",
        message: error.message || "حدث خطأ أثناء التفريغ الصوتي"
      });
    }
  }
};
