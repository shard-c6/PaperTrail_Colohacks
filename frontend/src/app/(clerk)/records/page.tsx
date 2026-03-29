"use client";

import { useState } from 'react';
import { FileText, Eye, CheckCircle2, Clock, Ban } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';

// Mock Data
const mockRecords = [
  { id: 'REC-001', template: 'Registration Form v2', date: '2026-03-28 10:45 AM', status: 'verified', accuracy: '99%' },
  { id: 'REC-002', template: 'ID Application', date: '2026-03-28 11:12 AM', status: 'verified', accuracy: '100%' },
  { id: 'REC-003', template: 'Tax Declaration', date: '2026-03-28 01:30 PM', status: 'pending_admin', accuracy: '72%' },
  { id: 'REC-004', template: 'Registration Form v2', date: '2026-03-27 09:15 AM', status: 'rejected', accuracy: 'N/A' },
];

export default function RecordsPage() {
  const { user } = useAppStore();
  const [filter, setFilter] = useState('all');

  const filteredRecords = filter === 'all' 
    ? mockRecords 
    : mockRecords.filter(r => r.status.includes(filter));

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'verified':
        return <span className="flex items-center gap-1 text-xs font-bold text-[var(--color-success)] bg-[var(--color-success-bg)]/10 px-2 py-1 rounded-full"><CheckCircle2 size={12} /> Verified</span>;
      case 'pending_admin':
        return <span className="flex items-center gap-1 text-xs font-bold text-[var(--color-warning)] bg-[var(--color-warning-bg)]/10 px-2 py-1 rounded-full"><Clock size={12} /> Pending Admin</span>;
      case 'rejected':
        return <span className="flex items-center gap-1 text-xs font-bold text-[var(--color-error)] bg-[var(--color-error-container)]/20 px-2 py-1 rounded-full"><Ban size={12} /> Rejected</span>;
      default:
        return <span>Unknown</span>;
    }
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto p-6 lg:p-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--color-on-bg)] mb-1">My Submissions</h1>
          <p className="text-[var(--color-on-surface-variant)] text-sm">Track the status of forms you've digitised.</p>
        </div>
        
        <div className="flex gap-2">
          {['all', 'verified', 'pending', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f 
                  ? 'bg-[var(--color-primary)] text-[var(--color-surface-lowest)] font-bold' 
                  : 'bg-[var(--color-surface-highest)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-bg)]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-surface-low)] border-b border-[var(--color-ghost-border)]">
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Record ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Template Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Submitted On</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">OCR Accuracy</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-ghost-border)]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--color-on-surface-variant)]">
                    No records found matching "{filter}".
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-[var(--color-surface-highest)]/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[var(--color-surface-high)] flex items-center justify-center text-[var(--color-primary)]">
                          <FileText size={16} />
                        </div>
                        <span className="font-mono text-sm font-semibold text-[var(--color-on-bg)]">{record.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-on-surface)]">{record.template}</td>
                    <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">{record.date}</td>
                    <td className="px-6 py-4 text-sm font-mono text-[var(--color-on-surface)]">{record.accuracy}</td>
                    <td className="px-6 py-4"><StatusBadge status={record.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                        <Eye size={16} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
