"use client";

import { useState, useEffect } from 'react';
import { FileText, Eye, CheckCircle2, Clock, Filter, Ban, Download } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

// Share exact mock from clerk dashboard for global view
const mockRecords = [
  { id: 'REC-001', clerk: 'Ramesh Kumar', template: 'Registration Form v2', dept: 'Revenue', date: '2026-03-28 10:45 AM', status: 'verified', accuracy: '99%' },
  { id: 'REC-002', clerk: 'Anita Singh', template: 'ID Application', dept: 'Transport', date: '2026-03-28 11:12 AM', status: 'verified', accuracy: '100%' },
  { id: 'REC-003', clerk: 'Ramesh Kumar', template: 'Tax Declaration', dept: 'Revenue', date: '2026-03-28 01:30 PM', status: 'pending_admin', accuracy: '72%' },
  { id: 'REC-004', clerk: 'Vikram Mehta', template: 'Registration Form v2', dept: 'Foreign Affairs', date: '2026-03-27 09:15 AM', status: 'rejected', accuracy: 'N/A' },
  { id: 'REC-005', clerk: 'Vikram Mehta', template: 'Passport App', dept: 'Foreign Affairs', date: '2026-03-27 10:15 AM', status: 'verified', accuracy: '95%' },
];

export default function AdminRecordsPage() {
  const [filter, setFilter] = useState('all');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await api.get('/admin/records?page_size=100');
        if (res.data?.records) {
           const formatted = res.data.records.map((r: any) => ({
             id: r.record_id,
             clerk: r.clerk_name || r.clerk_uid,
             template: r.template_name || 'Verification Pending',
             dept: r.department || 'N/A',
             date: new Date(r.submitted_at).toLocaleString(),
             status: 'verified', // All records submitted are inherently verified in this system
             accuracy: 'N/A' // Could be updated based on confidence if needed
           }));
           setRecords(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch records:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  const filteredRecords = filter === 'all' 
    ? records 
    : records.filter(r => r.status.includes(filter));

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'verified':
        return <span className="flex items-center gap-1 text-xs font-bold text-[var(--color-success)] bg-[var(--color-success-bg)]/10 px-2 py-1 rounded-full w-fit"><CheckCircle2 size={12} /> Verified</span>;
      case 'pending_admin':
        return <span className="flex items-center gap-1 text-xs font-bold text-[var(--color-warning)] bg-[var(--color-warning-bg)]/10 px-2 py-1 rounded-full w-fit"><Clock size={12} /> Flagged</span>;
      case 'rejected':
        return <span className="flex items-center gap-1 text-xs font-bold text-[var(--color-error)] bg-[var(--color-error-container)]/20 px-2 py-1 rounded-full w-fit"><Ban size={12} /> Rejected</span>;
      default:
        return <span>Unknown</span>;
    }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white mb-2">Global Records Viewer</h1>
          <p className="text-[var(--color-on-surface-variant)] text-sm">Access and audit every digitised document submitted across the platform.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md">
            <Filter size={16} className="mr-2" /> 
            Advanced Filters
          </Button>
          <Button variant="primary" size="md">
            <Download size={16} className="mr-2" /> 
            Export CSV
          </Button>
        </div>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        {/* Simple Tab Filters */}
        <div className="flex gap-4 p-4 border-b border-[var(--color-ghost-border)] bg-[var(--color-surface-lowest)]/50">
          {['all', 'verified', 'pending', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f 
                  ? 'bg-[var(--color-primary)] text-[var(--color-surface-lowest)] font-bold' 
                  : 'bg-[var(--color-surface-highest)] text-[var(--color-on-surface-variant)] hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-surface-low)] border-b border-[var(--color-ghost-border)]">
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Record ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Clerk</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Template & Dept</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Submitted On</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Accuracy</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-ghost-border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[var(--color-on-surface-variant)]">
                    Loading records from database...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[var(--color-on-surface-variant)]">
                    No records found matching "{filter}".
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-[var(--color-surface-highest)]/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[var(--color-surface-high)] flex items-center justify-center text-[var(--color-primary)] shrink-0">
                          <FileText size={16} />
                        </div>
                        <span className="font-mono text-sm font-semibold text-white">{record.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-on-surface)] font-medium">{record.clerk}</td>
                    <td className="px-6 py-4 text-sm text-[var(--color-on-surface)]">
                      {record.template}
                      <div className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{record.dept}</div>
                    </td>
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
