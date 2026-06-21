import './globals.css';
import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';

const ibmFont = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm',
});

export const metadata: Metadata = {
  title: 'Sawtify | On-Device Whisper Transcriber - التفريغ الصوتي المحلي الآمن',
  description: 'تفريق صوتي احترافي محلي في المتصفح باستخدام نموذج Whisper وتسريع كرت الشاشة WebGPU للخصوصية والسرعة الفائقة.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${ibmFont.variable}`}>
      <body className="bg-slate-950 text-slate-100 font-sans antialiased min-h-screen selection:bg-cyan-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
