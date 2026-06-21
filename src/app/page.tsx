import Detector from "../components/Detector";
import { Shield, Sparkles, AudioLines, Heart } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col">
      
      {/* Ambient background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-cyan-900/15 via-blue-900/5 to-transparent pointer-events-none blur-[120px] rounded-full z-0" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-900/10 pointer-events-none blur-[100px] rounded-full animate-pulse-slow z-0" />

      {/* Top Header bar */}
      <header className="border-b border-slate-900/80 bg-slate-950/40 backdrop-blur-md relative z-10">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-950/35">
              <AudioLines className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-bold text-slate-100 text-lg tracking-tight">صوتيفي | Sawtify</h1>
              <p className="text-[10px] text-cyan-400/80 font-medium tracking-wide">WebGPU AI Whisper Transcriber</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>معالجة محلية بالكامل في متصفحك</span>
            </div>
            <span className="px-2.5 py-1 text-xs bg-cyan-500/10 text-cyan-400 rounded-full font-mono border border-cyan-500/20">
              v2.0 WebGPU
            </span>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="relative z-10 pt-10 pb-4 text-center max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>تفريغ فوري للملفات الصوتية بدقة متناهية ودون إنترنت</span>
        </div>
        
        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
          التفريغ الصوتي المحلي الآمن <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">100% On-Device</span>
        </h2>
        
        <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          قم بتحويل أي ملف صوتي أو تسجيل صوتي مباشر إلى نصوص دقيقة بنقرة واحدة. لا حاجة للاتصال بالإنترنت، ولا قيود على الحجم، مع حماية مطلقة لخصوصية بياناتك وصوتياتك.
        </p>
      </section>

      {/* Main Interactive Application Tool */}
      <section className="relative z-10 flex-1">
        <Detector />
      </section>

      {/* Bottom Footer block */}
      <footer className="border-t border-slate-900/80 bg-slate-950/80 backdrop-blur-md relative z-10 mt-auto py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>أداة Sawtify مدعومة بـ</span>
            <span className="font-mono text-slate-400">Transformers.js v3</span>
            <span>و نموذج</span>
            <span className="font-mono text-slate-400">Whisper ONNX</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>صنع بكل حب لدعم الخصوصية وصناع المحتوى</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          </div>
        </div>
      </footer>
    </main>
  );
}
