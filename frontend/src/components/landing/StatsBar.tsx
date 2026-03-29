"use client";

import { motion } from 'framer-motion';

const stats = [
  { value: '10,000+', label: 'Forms Processed' },
  { value: '99.2%', label: 'Accuracy Rate' },
  { value: '< 3s', label: 'Processing Time' },
  { value: '100%', label: 'Audit Compliant' },
];

export function StatsBar() {
  return (
    <section className="relative z-20 -mt-10 px-6 max-w-6xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="glass-card md:rounded-2xl rounded-xl border border-[var(--color-ghost-border)] p-6 md:p-8"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 divide-x-0 md:divide-x divide-[var(--color-ghost-border)]">
          {stats.map((stat, i) => (
            <div key={i} className={`flex flex-col items-center justify-center text-center ${i % 2 === 1 ? 'border-l border-[var(--color-ghost-border)] pl-6 md:border-none md:pl-0' : ''}`}>
              <span className="text-3xl md:text-4xl font-serif font-bold text-[var(--color-on-bg)] mb-2">{stat.value}</span>
              <span className="text-sm font-medium text-[var(--color-on-surface-variant)]">{stat.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
