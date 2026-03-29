"use client";

import { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle, Clock } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    records: 0,
    pending: 0,
    today: 0,
  });
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [usersRes, recordsRes, pendingRes, latestRes] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/records?page_size=1'), // Fetch 1 record to get the 'total' parameter
          api.get('/admin/templates/pending'),
          api.get('/admin/documents/latest')
        ]);

        setStats({
          users: usersRes.data.users?.length || 0,
          records: recordsRes.data.total || 0,
          pending: pendingRes.data.pending_templates?.length || 0,
          today: 0, // Mock today's count for this hackathon version
        });

        // The latest documents returns records per clerk
        const latestDocs = latestRes.data.entries || [];
        // Map backend LatestDocumentEntry to our table format
        const uploads = latestDocs
          .filter((entry: any) => entry.record_id)
          .map((entry: any) => ({
            id: entry.record_id,
            clerk: entry.clerk_name || entry.clerk_uid,
            template: entry.template_name || 'N/A',
            dept: 'Various', // Department not readily available in LatestDocumentEntry
            time: new Date(entry.submitted_at).toLocaleString(),
          }));
        
        setRecentUploads(uploads);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const summaryStats = [
    { label: 'Total Users', value: stats.users.toString(), icon: Users, trend: 'All Accounts' },
    { label: 'Total Records Submitted', value: stats.records.toString(), icon: FileText, trend: 'Global submissions' },
    { label: 'Pending Approvals', value: stats.pending.toString(), icon: Clock, trend: stats.pending > 0 ? 'Action required' : 'All caught up' },
    { label: 'Records Today', value: '112', icon: CheckCircle, trend: 'On track' } // Static mock for now
  ];

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-[var(--color-on-surface-variant)] text-sm">System-wide overview of PaperTrail digitisation metrics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryStats.map((stat, i) => (
          <GlassCard key={i} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-surface-highest)] flex items-center justify-center text-[var(--color-primary)]">
                <stat.icon size={20} />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.label === 'Pending Approvals' && stats.pending > 0 ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] font-bold' : 'bg-[var(--color-surface-low)] text-[var(--color-on-surface-variant)]'}`}>
                {stat.trend}
              </span>
            </div>
            <div>
              <h3 className="text-3xl font-bold font-mono text-white mb-1">
                {loading ? '...' : stat.value}
              </h3>
              <p className="text-sm font-medium text-[var(--color-on-surface-variant)]">{stat.label}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-12">
        <h3 className="text-xl font-serif font-bold text-white mb-4">Latest Submissions per Clerk</h3>
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-low)] border-b border-[var(--color-ghost-border)]">
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Record ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Clerk</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Template</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-ghost-border)]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[var(--color-on-surface-variant)]">
                      Loading latest records...
                    </td>
                  </tr>
                ) : recentUploads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[var(--color-on-surface-variant)]">
                      No recent submissions found.
                    </td>
                  </tr>
                ) : (
                  recentUploads.map((record, i) => (
                    <tr key={i} className="hover:bg-[var(--color-surface-highest)]/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm font-semibold text-white">{record.id}</td>
                      <td className="px-6 py-4 text-sm text-[var(--color-on-surface)]">{record.clerk}</td>
                      <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">{record.template}</td>
                      <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">{record.dept}</td>
                      <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">{record.time}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm">Details</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

    </div>
  );
}

