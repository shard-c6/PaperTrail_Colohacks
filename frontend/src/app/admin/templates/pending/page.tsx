"use client";

import { useState, useEffect } from 'react';
import { User, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';

export default function TemplateApprovalPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPendingTemplates = async () => {
    try {
      const res = await api.get('/admin/templates/pending');
      const mapped = (res.data.pending_templates || []).map((t: any) => ({
        id: t.template_id,
        name: t.name,
        clerk: t.clerk_uid,
        department: t.department,
        submittedAt: new Date(t.created_at).toLocaleString(),
        annotatedFields: t.field_schema?.length || 0,
      }));
      setTemplates(mapped);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to fetch pending templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTemplates();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/admin/templates/${id}/approve`);
      toast.success('Template Approved. Embedding generated and live.');
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.detail?.message || 'Approval failed');
    }
  };

  const handleReject = async () => {
    if (rejectReason.trim().length < 10) {
      toast.error('Please provide a substantive reason (min 10 chars).');
      return;
    }
    try {
      if (activeTemplate) {
        await api.post(`/admin/templates/${activeTemplate}/reject`, { reason: rejectReason });
        toast.success('Template Rejected. Clerk notified.');
        setTemplates(prev => prev.filter(t => t.id !== activeTemplate));
        setRejectModalOpen(false);
        setRejectReason('');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.detail?.message || 'Rejection failed');
    }
  };

  const openRejectModal = (id: string) => {
    setActiveTemplate(id);
    setRejectModalOpen(true);
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-white mb-2">Template Approval Queue</h1>
        <p className="text-[var(--color-on-surface-variant)] text-sm">Review clerk-submitted form templates before they are converted to embeddings and go live.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-center text-[var(--color-on-surface-variant)]">
          Loading templates...
        </div>
      ) : templates.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center p-12 text-center bg-[var(--color-surface-lowest)]/50">
          <CheckCircle size={48} className="text-[var(--color-success)] mb-4" />
          <h3 className="text-xl font-bold font-serif text-white mb-2">All Caught Up</h3>
          <p className="text-[var(--color-on-surface-variant)]">There are no pending templates requiring your approval right now.</p>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {templates.map((template) => (
            <GlassCard key={template.id} className="p-0 overflow-hidden flex flex-col md:flex-row">
              {/* Left Side: Image Preview Thumbnail */}
              <div className="w-full md:w-1/3 h-48 md:h-auto bg-[var(--color-surface-lowest)] border-b md:border-b-0 md:border-r border-[var(--color-ghost-border)] p-4 flex flex-col items-center justify-center relative">
                <div className="w-full h-full max-h-40 bg-[var(--color-surface-high)] rounded border border-[var(--color-ghost-border)] flex items-center justify-center overflow-hidden">
                  <div className="relative w-[30%] h-[80%] bg-white/5 shadow-md p-1 flex flex-col gap-1 items-center rounded-sm">
                    {/* Tiny Mock Bounding Boxes */}
                    <div className="w-[80%] h-[15%] rounded-sm border-[0.5px] border-[var(--color-warning)] bg-[var(--color-warning)]/20 mt-1"></div>
                    <div className="w-[80%] h-[15%] rounded-sm border-[0.5px] border-[var(--color-warning)] bg-[var(--color-warning)]/20"></div>
                    <div className="w-[40%] h-[15%] rounded-sm border-[0.5px] border-[var(--color-warning)] bg-[var(--color-warning)]/20 self-start ml-[10%]"></div>
                  </div>
                </div>
                <div className="absolute bottom-6 right-6 bg-[var(--color-surface)]/80 backdrop-blur px-2 py-1 rounded text-xs font-mono text-[var(--color-primary)] font-bold">
                  {template.annotatedFields} Fields
                </div>
              </div>

              {/* Right Side: Metadata & Actions */}
              <div className="w-full md:w-2/3 p-6 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-xs font-mono font-bold text-[var(--color-primary)]">{template.id}</span>
                    <h3 className="text-xl font-bold text-white mt-1">{template.name}</h3>
                    <p className="text-sm text-[var(--color-on-surface-variant)]">{template.department}</p>
                  </div>
                  <span className="bg-[var(--color-warning-bg)]/10 text-[var(--color-warning)] text-xs font-bold px-2.5 py-1 rounded-full border border-[var(--color-warning)]/20 uppercase tracking-wide">
                    Pending
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-[var(--color-on-surface-variant)] mb-auto pb-6">
                  <div className="flex items-center gap-1.5 bg-[var(--color-surface-low)] px-3 py-1.5 rounded-full border border-[var(--color-ghost-border)]">
                    <User size={14} className="text-[var(--color-primary)]" />
                    <span className="font-medium text-[var(--color-on-surface)]">{template.clerk}</span>
                  </div>
                  <div className="text-xs">
                    Submitted: {template.submittedAt}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[var(--color-ghost-border)]">
                  <Button variant="secondary" className="flex-1 bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-white border-[var(--color-success)]/30 hover:shadow-[0_0_15px_var(--color-success-bg)]" onClick={() => handleApprove(template.id)}>
                    <CheckCircle size={18} className="mr-2" /> Approve & Embed
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => openRejectModal(template.id)}>
                    <XCircle size={18} className="mr-2" /> Reject
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Template">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-on-surface-variant)] mb-2">
            Please provide a detailed reason for rejecting this template. This will be shown to the clerk who submitted it.
          </p>
          <textarea
            className="w-full h-32 p-3 rounded-md ghost-input text-white text-sm outline-none resize-none"
            placeholder="e.g., Bounding boxes for the signature field overlap with the date field. Please redraw the annotations cleanly."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            maxLength={500}
          />
          <div className="text-right text-xs text-[var(--color-muted)]">{rejectReason.length}/500 chars</div>
          
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
