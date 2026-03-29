"use client";

import dynamic from 'next/dynamic';
import { SquareDashedMousePointer, AlertTriangle, Save, ScrollText } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

const MotionDiv = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.div),
  { ssr: false }
);

const features = [
  {
    icon: SquareDashedMousePointer,
    title: 'Bounding box field sync',
    desc: 'Visual linkage between form image region and extracted data input.'
  },
  {
    icon: AlertTriangle,
    title: 'Uncertainty highlighting',
    desc: 'Amber alerts for fields falling below OCR confidence thresholds.'
  },
  {
    icon: Save,
    title: 'Continuous auto-save',
    desc: 'Drafts are safely persisted every 60 seconds without manual action.'
  },
  {
    icon: ScrollText,
    title: 'Immutable audit trail',
    desc: 'Original scan, raw extraction, and corrected data permanently linked.'
  }
];

export function SplitViewPreview() {
  return (
    <section className="py-24 px-6 md:px-12 bg-gradient-to-b from-[var(--color-bg)] to-[var(--color-surface-lowest)]">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        
        {/* Left: Animated Mockup */}
        <MotionDiv 
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full lg:w-1/2 relative"
        >
          {/* Ambient glow behind mockup */}
          <div className="absolute inset-0 bg-[var(--color-primary)]/20 blur-[80px] rounded-full pointer-events-none"></div>
          
          <GlassCard className="p-2 sm:p-4 rounded-xl border border-[var(--color-ghost-border)] bg-[var(--color-surface-highest)] relative z-10 shadow-2xl">
            {/* Split View Mockup Window Bars */}
            <div className="flex gap-1.5 px-3 py-2 border-b border-[var(--color-ghost-border)] mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
            </div>
            
            <div className="flex flex-row divide-x divide-[var(--color-ghost-border)] h-[300px] sm:h-[400px]">
              {/* Image side */}
              <div className="flex-1 p-3 sm:p-4 bg-[var(--color-surface-lowest)] relative overflow-hidden">
                <div className="w-full h-full bg-white/5 rounded relative">
                  {/* Mock Bounding Box */}
                  <MotionDiv 
                    animate={{ 
                      borderColor: ['var(--color-ghost-border)', 'var(--color-warning)', 'var(--color-ghost-border)'],
                      backgroundColor: ['transparent', 'var(--color-pt-warning-bg)', 'transparent'] 
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-[30%] left-[10%] w-[60%] h-[12%] border-2 rounded-sm"
                  ></MotionDiv>
                </div>
              </div>

              {/* Form side */}
              <div className="flex-1 p-3 sm:p-4 bg-[var(--color-bg)] flex flex-col gap-3">
                <div className="h-10 w-full rounded bg-[var(--color-surface-high)] border border-[var(--color-ghost-border)]"></div>
                
                {/* Uncertain field mockup */}
                <MotionDiv 
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="h-10 w-full rounded border-l-4 border-l-[var(--color-warning)] bg-[var(--color-warning)]/10 px-2 flex items-center relative"
                >
                  <div className="w-3/4 h-2 bg-white/30 rounded"></div>
                  <AlertTriangle size={14} className="text-[var(--color-warning)] ml-auto" />
                </MotionDiv>
                
                <div className="h-10 w-full rounded bg-[var(--color-surface-high)] border border-[var(--color-ghost-border)]"></div>
                <div className="mt-auto h-8 w-1/2 rounded bg-[var(--color-primary)] ml-auto"></div>
              </div>
            </div>
          </GlassCard>
        </MotionDiv>

        {/* Right: Feature Bullets */}
        <div className="w-full lg:w-1/2">
          <MotionDiv 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center lg:text-left"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-[var(--color-on-bg)] mb-4">
              Intelligence you can see.
            </h2>
            <p className="text-[var(--color-on-surface-variant)] text-lg border-l-2 border-[var(--color-primary)] pl-4">
              Our split-view interface is designed for high-speed, high-accuracy human verification. 
              We don&apos;t hide the AI&apos;s math; we highlight its uncertainty.
            </p>
          </MotionDiv>

          <div className="flex flex-col gap-6">
            {features.map((feature, i) => (
              <MotionDiv 
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="mt-1 w-10 h-10 shrink-0 rounded-full bg-[var(--color-surface-highest)] border border-[var(--color-ghost-border)] flex items-center justify-center text-[var(--color-primary)]">
                  <feature.icon size={18} />
                </div>
                <div>
                  <h4 className="text-[var(--color-on-bg)] font-bold text-lg mb-1">{feature.title}</h4>
                  <p className="text-[var(--color-on-surface-variant)] text-sm">{feature.desc}</p>
                </div>
              </MotionDiv>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
