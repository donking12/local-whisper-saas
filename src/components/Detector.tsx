"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, 
  Square, 
  UploadCloud, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Globe,
  Info
} from "lucide-react";
import { preprocessAudio } from "../utils/audio";
import confetti from "canvas-confetti";

interface TranscribeSegment {
  text: string;
  timestamp?: [number, number];
}

interface FileLoadingState {
  file: string;
  progress: number;
}

export default function Detector() {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [progressTracker, setProgressTracker] = useState<Record<string, number>>({});
  const [transcription, setTranscription] = useState<string>("");
  const [segments, setSegments] = useState<TranscribeSegment[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("onnx-community/whisper-tiny.en");
  const [hardwareMode, setHardwareMode] = useState<"webgpu" | "wasm">("webgpu");
  const [languageMode, setLanguageMode] = useState<"en" | "auto">("en");
  const [copied, setCopied] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Web Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize Web Worker
  useEffect(() => {
    // Setup Web Worker
    workerRef.current = new Worker(new URL("../../public/whisper.worker.js", import.meta.url), {
      type: "module",
    });

    workerRef.current.onmessage = (event) => {
      const { status, message, file, progress, result, error } = event.data;

      if (status === "loading" || status === "loading_model" || status === "processing_audio") {
        setStatusMessage(message);
      } else if (status === "progress") {
        setProgressTracker(prev => ({
          ...prev,
          [file]: progress
        }));
      } else if (status === "success") {
        setIsProcessing(false);
        setStatusMessage("");
        setProgressTracker({});
        
        if (result && result.text) {
          setTranscription(result.text);
          if (result.chunks) {
            setSegments(result.chunks.map((c: any) => ({
              text: c.text,
              timestamp: c.timestamp
            })));
          }
          triggerSuccessConfetti();
        }
      } else if (status === "error") {
        setIsProcessing(false);
        setStatusMessage("حدث خطأ ما أثناء معالجة النموذج الذكي");
        alert("Error: " + message);
      }
    };

    // Detect WebGPU availability and default state
    if (typeof navigator !== "undefined" && "gpu" in navigator) {
      setHardwareMode("webgpu");
    } else {
      setHardwareMode("wasm");
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      stopTimer();
    };
  }, []);

  const triggerSuccessConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#06b6d4", "#3b82f6", "#10b981"]
    });
  };

  // Audio Recording Timers
  const startTimer = () => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle live recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const options = { mimeType: "audio/webm" };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback for Safari/iOS
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      startTimer();
    } catch (err) {
      console.error(err);
      alert("لم نتمكن من الوصول للميكروفون الخاص بك. يرجى إعطاء صلاحية الوصول أولاً.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
  };

  // Handle drag and drop upload
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      loadAudioFile(file);
    } else {
      alert("يرجى إدخال ملف صوتي صالح فقط مثل (MP3, WAV, M4A)");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadAudioFile(file);
    }
  };

  const loadAudioFile = (file: File) => {
    const audioUrl = URL.createObjectURL(file);
    setAudioBlob(file);
    setAudioUrl(audioUrl);
    setTranscription("");
    setSegments([]);
  };

  // Execute transcription request via Worker
  const handleTranscribe = async () => {
    if (!audioBlob || !workerRef.current) return;

    try {
      setIsProcessing(true);
      setStatusMessage("جاري فك الترميز الصوتي وضبط التردد إلى 16000Hz...");

      // Preprocess sound data
      const audioData = await preprocessAudio(audioBlob);

      setStatusMessage("جاري تحضير نموذج الذكاء الاصطناعي...");

      // Setup language parameters
      const whisperOptions: any = {};
      if (languageMode === "en") {
        whisperOptions.language = "english";
      } else {
        whisperOptions.language = null; // Auto-detect
      }

      // Send payload to our background web worker
      workerRef.current.postMessage({
        type: "transcribe",
        audioData,
        modelName: selectedModel,
        device: hardwareMode,
        dtype: hardwareMode === "webgpu" ? "fp16" : "fp32",
        options: whisperOptions
      });

    } catch (err: any) {
      console.error(err);
      alert("خطأ في معالجة الملف الصوتي: " + err.message);
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  // Helper copy functions
  const copyToClipboard = () => {
    if (!transcription) return;
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxtFile = () => {
    if (!transcription) return;
    const element = document.createElement("a");
    const file = new Blob([transcription], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `Sawtify-Transcription-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const toggleAudioPlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
    } else {
      audioPlayerRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      {/* Main Grid Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Right Dashboard panel: Controls and Inputs */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Local Device Model Configuration Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">إعدادات محرك الذكاء الاصطناعي المحلي</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-cyan-400 border border-slate-700">
                100% Client-Side
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">نموذج الهمس (Whisper Model)</label>
                <select 
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    if (e.target.value.includes(".en")) {
                      setLanguageMode("en");
                    } else {
                      setLanguageMode("auto");
                    }
                  }}
                >
                  <option value="onnx-community/whisper-tiny.en">Whisper Tiny (English Only) - أسرع للإنجليزية</option>
                  <option value="onnx-community/whisper-tiny">Whisper Tiny (Multilingual) - متعدد اللغات</option>
                  <option value="onnx-community/whisper-base">Whisper Base (Multilingual) - دقة أعلى</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">لغة تفريغ الصوت</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button 
                    type="button"
                    onClick={() => setLanguageMode("en")}
                    className={`py-1.5 px-3 text-xs font-medium rounded-md transition ${languageMode === "en" ? "bg-cyan-500 text-slate-950 font-semibold" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    الإنجليزية فقط
                  </button>
                  <button 
                    type="button"
                    disabled={selectedModel.endsWith(".en")}
                    onClick={() => setLanguageMode("auto")}
                    className={`py-1.5 px-3 text-xs font-medium rounded-md transition disabled:opacity-40 ${languageMode === "auto" ? "bg-cyan-500 text-slate-950 font-semibold" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    كشف تلقائي (عربي/أخرى)
                  </button>
                </div>
              </div>
            </div>

            {/* Hardware Acceleration Indicator */}
            <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>تسريع العتاد المكتشف:</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if ("gpu" in navigator) setHardwareMode("webgpu");
                  }}
                  disabled={!("gpu" in navigator)}
                  className={`px-3 py-1 rounded text-xs font-mono font-medium transition ${hardwareMode === "webgpu" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-slate-950 text-slate-500 border border-slate-800"}`}
                >
                  WebGPU (موصى به)
                </button>
                <button
                  type="button"
                  onClick={() => setHardwareMode("wasm")}
                  className={`px-3 py-1 rounded text-xs font-mono font-medium transition ${hardwareMode === "wasm" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" : "bg-slate-950 text-slate-500 border border-slate-800"}`}
                >
                  WebAssembly (CPU)
                </button>
              </div>
            </div>
          </div>

          {/* Main Sound Acquisition Module: Drag/Record */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-5">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-cyan-400" />
              <span>إدخال الصوت للتفريغ</span>
            </h2>

            {/* Audio Recording Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Microphone Interface Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center group transition hover:border-slate-700">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${isRecording ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-slate-900 text-slate-300 group-hover:text-cyan-400"}`}>
                  {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </div>
                
                <h4 className="font-semibold text-slate-200 text-sm mb-1">
                  {isRecording ? "جاري التسجيل الحي..." : "تسجيل صوتي مباشر"}
                </h4>
                <p className="text-xs text-slate-400 mb-4 max-w-[200px]">
                  {isRecording ? "تحدث بوضوح عبر ميكروفون جهازك" : "استخدم ميكروفون جهازك لتسجيل مذكراتك مباشرة"}
                </p>

                {isRecording ? (
                  <div className="flex flex-col items-center gap-3 w-full">
                    <span className="font-mono text-lg font-bold text-red-400 tracking-wider">
                      {formatTime(recordingTime)}
                    </span>
                    <button 
                      type="button"
                      onClick={stopRecording}
                      className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg text-xs transition duration-200"
                    >
                      إيقاف وحفظ التسجيل
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={startRecording}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 font-medium rounded-lg text-xs transition duration-200"
                  >
                    ابدأ التسجيل الصوتي
                  </button>
                )}
              </div>

              {/* Drag and Drop File Upload Area */}
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-cyan-500/50 transition duration-300 relative"
              >
                <input 
                  type="file" 
                  accept="audio/*" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleFileSelect}
                />
                <div className="w-14 h-14 rounded-full bg-slate-900 text-slate-300 group-hover:text-cyan-400 flex items-center justify-center mb-3 transition-colors duration-300">
                  <UploadCloud className="w-6 h-6" />
                </div>
                
                <h4 className="font-semibold text-slate-200 text-sm mb-1">سحب وإفلات الملفات</h4>
                <p className="text-xs text-slate-400 max-w-[200px]">
                  اسحب ملفاً هنا أو تصفح (WAV, MP3, AAC) بحد أقصى 25 ميجابايت
                </p>
              </div>
            </div>

            {/* Active Selected/Recorded Audio File Control Panel */}
            {audioUrl && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    الملف الصوتي الحالي المجهز
                  </span>
                  <button 
                    onClick={() => {
                      setAudioUrl(null);
                      setAudioBlob(null);
                      setTranscription("");
                      setSegments([]);
                    }}
                    className="text-red-400 hover:text-red-300 font-medium transition"
                  >
                    إلغاء الملف
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleAudioPlayback}
                    className="w-10 h-10 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center hover:scale-105 transition active:scale-95 shrink-0"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-slate-950" />}
                  </button>
                  
                  <div className="flex-1 bg-slate-900 h-2.5 rounded-full overflow-hidden relative">
                    <div className={`h-full bg-cyan-500/60 rounded-full ${isPlaying ? "w-full transition-all duration-10000 ease-linear" : "w-1/3"}`} />
                  </div>
                </div>

                <audio 
                  ref={audioPlayerRef} 
                  src={audioUrl} 
                  onEnded={() => setIsPlaying(false)}
                  className="hidden" 
                />

                <button
                  type="button"
                  onClick={handleTranscribe}
                  disabled={isProcessing}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-xl text-sm transition-all duration-300 shadow-lg shadow-cyan-950/20 flex items-center justify-center gap-2 mt-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>جاري المعالجة الآمنة...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>بدء التفريغ الصوتي الذكي (AI Transcribe)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Localized Info Alert box */}
          <div className="bg-cyan-950/10 border border-cyan-900/40 rounded-xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-200 block mb-1">لماذا Sawtify آمن تماماً؟</strong>
              نقوم بتحميل وتخزين نماذج الذكاء الاصطناعي في ذاكرة التخزين المؤقت لمتصفحك فقط. يتم فك ترميز ومعالجة الصوت محلياً على جهازك دون إرسال أي بت من البيانات إلى أي خوادم خارجية.
            </div>
          </div>
        </div>

        {/* Left Dashboard panel: Results and Processing Progress Indicators */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-4">
              <h3 className="text-md font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>نتائج التفريغ الصوتي</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {segments.length > 0 ? `${segments.length} مقاطع` : "جاهز للبدء"}
              </span>
            </div>

            {/* Live Model Downloading Progress Indicators */} 
            {Object.keys(progressTracker).length > 0 && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 mb-4 flex flex-col gap-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  جاري تحميل ملفات النموذج لأول مرة (مخزن مؤقتاً لاحقاً):
                </span>
                {Object.entries(progressTracker).map(([file, pct]) => (
                  <div key={file} className="text-xs">
                    <div className="flex justify-between text-slate-400 mb-1 font-mono">
                      <span className="truncate max-w-[180px]">{file}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Active Status Display Box */}
            {isProcessing && (
              <div className="bg-cyan-950/10 border border-cyan-900/40 rounded-xl p-4 mb-4 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="text-xs text-cyan-400 font-medium">{statusMessage}</span>
              </div>
            )}

            {/* Text Output Box area */}
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 relative min-h-[250px] flex flex-col">
              {transcription ? (
                <div className="flex flex-col gap-4 flex-1">
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line text-right overflow-y-auto max-h-[350px] pr-2">
                    {transcription}
                  </div>
                  
                  {/* Time Segment blocks */} 
                  {segments.length > 0 && (
                    <div className="border-t border-slate-800/80 pt-4 mt-auto">
                      <h4 className="text-xs font-semibold text-slate-400 mb-3">التفريغ المفصل بالطابع الزمني:</h4>
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
                        {segments.map((seg, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px] bg-slate-900/50 p-2 rounded border border-slate-900">
                            {seg.timestamp && (
                              <span className="font-mono bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded tracking-wider shrink-0">
                                [{seg.timestamp[0].toFixed(1)}s - {seg.timestamp[1].toFixed(1)}s]
                              </span>
                            )}
                            <span className="text-slate-300 text-right flex-1">{seg.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <Globe className="w-10 h-10 text-slate-800 mb-3 animate-pulse" />
                  <p className="text-slate-400 text-sm font-medium mb-1">لا يوجد نص مفرغ حالياً</p>
                  <p className="text-xs text-slate-600 max-w-[260px]">
                    قم بتسجيل مقطع حي أو رفع ملف صوتي، ثم انقر على زر بدء المعالجة المحلية.
                  </p>
                </div>
              )} 
            </div>

            {/* Copy & Export Actions bottom toolbar */}
            {transcription && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-300 hover:text-white text-xs font-medium transition duration-200 active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>تم نسخ النص!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>نسخ النص للكلب بورد</span>
                    </>
                  )}
                </button>

                <button 
                  onClick={downloadTxtFile}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-cyan-800/30 hover:border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:text-cyan-300 text-xs font-medium transition duration-200 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل ملف نصي TXT</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
