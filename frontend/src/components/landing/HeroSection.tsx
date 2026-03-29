"use client";

import dynamic from 'next/dynamic';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

// Lazy-load framer-motion to avoid blocking initial render
const MotionDiv = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.div),
  { ssr: false }
);
const MotionH1 = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.h1),
  { ssr: false }
);
const MotionP = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.p),
  { ssr: false }
);

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-6 overflow-hidden">
      {/* Background Blobs for Liquid Glass effect */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[var(--color-secondary)]/10 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[var(--color-primary)]/10 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none" style={{ animationDelay: '3s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-secondary-container)]/20 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-5xl mx-auto text-center flex flex-col items-center">
        
        {/* SVG Scan Animation (Mockup) */}
        <MotionDiv 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-24 h-24 sm:w-32 sm:h-32 mb-8 relative glass-card flex items-center justify-center overflow-hidden"
        >
          {/* Paper Document Base */}
          <div className="w-14 h-18 sm:w-20 sm:h-24 bg-white rounded shadow-sm border border-gray-200 relative overflow-hidden">
            <div className="w-8 sm:w-12 h-1 bg-gray-200 mt-3 sm:mt-5 ml-2 mt:ml-3 rounded-full"></div>
            <div className="w-6 sm:w-10 h-1 bg-gray-200 mt-2 ml-2 sm:ml-3 rounded-full"></div>
            <div className="w-10 sm:w-16 h-1 bg-gray-200 mt-2 ml-2 sm:ml-3 rounded-full"></div>
          </div>
          
          {/* Laser Scan Line */}
          <MotionDiv 
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 w-full h-0.5 bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)] pointer-events-none"
          />
        </MotionDiv>

        {/* Headlines */}
        <MotionH1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl sm:text-6xl md:text-7xl font-serif font-bold text-[var(--color-on-bg)] tracking-tight mb-6"
        >
          Digitise. Verify. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]">Preserve.</span>
        </MotionH1>

        <MotionP 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg sm:text-xl text-[var(--color-on-surface-variant)] max-w-2xl mb-10 leading-relaxed font-sans"
        >
          PaperTrail transforms handwritten government forms into structured digital records. 
          AI-powered extraction meets human intelligence — every field verified, every submission traceable.
        </MotionP>

        {/* CTAs */}
        <MotionDiv 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto px-6 sm:px-0"
        >
          <Link href="/signup" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto bg-white text-[var(--color-surface)] hover:bg-[var(--color-on-surface-variant)] rounded-xl group px-8">
              Start Digitising
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
            </Button>
          </Link>
          <Link href="#how-it-works" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto rounded-xl px-8">
              See How It Works
            </Button>
          </Link>
        </MotionDiv>

        {/* Scroll Indicator */}
        <MotionDiv 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-20 absolute bottom-10 flex justify-center w-full max-w-5xl mx-auto"
        >
          <MotionDiv
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="text-[var(--color-on-surface-variant)]" size={32} />
          </MotionDiv>
        </MotionDiv>

      </div>
    </section>
  );
}
