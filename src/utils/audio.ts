/**
 * Converts any user uploaded/recorded audio file to the standard Float32Array
 * sampled at exactly 16000 Hz, single channel (mono) as required by Whisper AI.
 */
export async function preprocessAudio(audioFile: File | Blob): Promise<Float32Array> {
  const audioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!audioContextClass) {
    throw new Error("واجهة AudioContext غير مدعومة في متصفحك الحالي");
  }

  const audioCtx = new audioContextClass({ sampleRate: 16000 });
  const arrayBuffer = await audioFile.arrayBuffer();
  
  let audioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err) {
    throw new Error("فشل فك تشفير الملف الصوتي. يرجى التأكد من أن صيغة الملف صالحة وغير تالفة.");
  }

  // Convert and downmix to Mono, resampling to 16000 Hz using OfflineAudioContext
  const offlineCtx = new OfflineAudioContext(
    1, // mono
    Math.round(audioBuffer.duration * 16000),
    16000
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();

  const processedBuffer = await offlineCtx.startRendering();
  return processedBuffer.getChannelData(0);
}
