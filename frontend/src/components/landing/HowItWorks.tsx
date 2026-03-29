"use client";

import dynamic from 'next/dynamic';
import { CloudUpload, Sparkles, TextCursorInput, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

const MotionDiv = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.div),
  { ssr: false }
);

const steps = [
  {
    icon: CloudUpload,
    title: 'Upload',
    desc: 'Photograph or scan any government form.'
  },
  {
    icon: Sparkles,
    title: 'Clean',
    desc: 'AI removes noise, corrects skew, and enhances clarity.'
  },
  {
    icon: TextCursorInput,
    title: 'Extract',
    desc: 'OCR maps every field. Uncertain values are flagged for you.'
  },
  {
    icon: CheckCircle,
    title: 'Submit',
    desc: 'Review, correct, and submit. A full audit trail is created.'
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

import type { Variants } from 'framer-motion';

const item: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 md:px-12 bg-[var(--color-bg)]">
      <div className="max-w-7xl mx-auto">
        <MotionDiv 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-[var(--color-on-bg)] mb-4">How It Works</h2>
        </MotionDiv>

        <MotionDiv 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {steps.map((step, idx) => (
            <MotionDiv key={idx} variants={item} className="relative group">
              <GlassCard glowHover className="h-full flex flex-col items-center text-center p-8 bg-[var(--color-surface-lowest)]/50">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-high)] border border-[var(--color-ghost-border)] flex items-center justify-center mb-6 group-hover:border-[var(--color-primary)]/50 transition-colors shadow-inner">
                  <step.icon className="text-[var(--color-primary)]" size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold font-serif text-[var(--color-on-bg)] mb-3">
                  <span className="text-[var(--color-on-surface-variant)] text-sm mr-2 font-sans font-normal">Step {idx + 1}</span>
                  {step.title}
                </h3>
                <p className="text-[var(--color-on-surface-variant)] text-sm leading-relaxed">
                  {step.desc}
                </p>
              </GlassCard>
              
              {/* Connector dots between cards on large screens */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-6 w-6 h-px border-t-2 border-dashed border-[var(--color-ghost-border)] pointer-events-none transform -translate-y-1/2"></div>
              )}
            </MotionDiv>
          ))}
        </MotionDiv>
      </div>
    </section>
  );
}
