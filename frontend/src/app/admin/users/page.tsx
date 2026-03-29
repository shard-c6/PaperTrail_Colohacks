"use client";

import { useState, useEffect } from 'react';
import { User, Shield, Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import useAppStore from '@/store/useAppStore';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  const currentUser = useAppStore(state => state.user);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      // map backend UserResponse to table
      const fetchedUsers = (res.data.users || []).map((u: any) => ({
        uid: u.uid,
        name: u.name || 'Unknown',
        email: u.email || 'N/A',
        role: u.role,
        joined: new Date(u.created_at).toLocaleDateString()
      }));
      setUsers(fetchedUsers);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = filter === 'all' 
    ? users 
    : users.filter(u => u.role === filter);

  const handleRoleChange = async (uid: string, currentRole: string) => {
    if (uid === currentUser?.uid) {
      toast.error('You cannot change your own role.');
      return;
    }

    const newRole = currentRole === 'admin' ? 'clerk' : 'admin';
    const confirmMsg = `Are you sure you want to ${newRole === 'admin' ? 'promote' : 'demote'} this user to ${newRole}?`;
    
    if (window.confirm(confirmMsg)) {
      try {
        await api.patch(`/admin/users/${uid}/role`, { new_role: newRole });
        setUsers(prev => prev.map(u => 
          u.uid === uid ? { ...u, role: newRole } : u
        ));
        toast.success(`User role updated to ${newRole}`);
      } catch (e: any) {
        console.error(e);
        toast.error(e.response?.data?.detail?.message || 'Failed to update role');
      }
    }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white mb-2">User Management</h1>
          <p className="text-[var(--color-on-surface-variant)] text-sm">Manage system access and roles across the digitisation platform.</p>
        </div>
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" size={18} />
            <input 
              type="text" 
              placeholder="Search users..." 
              className="w-full h-10 pl-10 pr-4 rounded-md ghost-input text-white focus:outline-none text-sm"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
            {['all', 'admin', 'clerk'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  filter === f 
                    ? 'bg-[var(--color-primary)] text-[var(--color-surface-lowest)]' 
                    : 'bg-[var(--color-surface-low)] text-[var(--color-on-surface-variant)] hover:text-white'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}s
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-[var(--color-ghost-border)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-surface-low)] border-b border-[var(--color-ghost-border)] text-[var(--color-on-surface-variant)]">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-ghost-border)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[var(--color-on-surface-variant)]">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[var(--color-on-surface-variant)]">
                    No users found.
                  </td>
                </tr>
              ) : filteredUsers.map((u) => (
                <tr key={u.uid} className="hover:bg-[var(--color-surface-high)]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary-container)] text-[var(--color-primary)] flex items-center justify-center font-bold text-xs uppercase">
                        {u.name.substring(0,2)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{u.name}</div>
                        <div className="text-xs text-[var(--color-on-surface-variant)] font-mono mt-0.5">{u.uid}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-on-surface)]">{u.email}</td>
                  <td className="px-6 py-4">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-error)]/20 text-[var(--color-error)] text-xs font-bold uppercase">
                        <Shield size={12} /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-success)]/10 text-[var(--color-success)] text-xs font-bold uppercase">
                        <User size={12} /> Clerk
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">{u.joined}</td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => handleRoleChange(u.uid, u.role)}
                      className="text-xs h-8 px-3"
                      disabled={u.uid === currentUser?.uid}
                      title={u.uid === currentUser?.uid ? "You cannot change your own role" : ""}
                    >
                      <ArrowUpDown size={14} className="mr-1.5" />
                      {u.role === 'admin' ? 'Demote to Clerk' : 'Promote to Admin'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
