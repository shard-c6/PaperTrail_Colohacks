"use client";

import { ScanText, Moon, Sun, Search, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { useAppStore } from '@/store/useAppStore';
import { ThemeToggle } from '@/components/ThemeToggle';

export function AuthenticatedNavbar({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();
  const { user, logout } = useAppStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    logout();
    router.push('/login');
  };

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  return (
    <nav className="sticky top-0 w-full z-40 bg-[var(--color-surface)] border-b border-[var(--color-ghost-border)] shadow-sm h-16 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href={isAdmin ? "/admin" : "/upload"} className="flex items-center gap-2">
          <ScanText className="text-[var(--color-primary)]" size={20} />
          <span className="text-lg font-serif font-bold text-[var(--color-on-bg)] leading-none mt-1">PaperTrail</span>
        </Link>
        
        {isAdmin && (
          <div className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link href="/admin" className="px-3 py-1.5 rounded-md text-[var(--color-primary)] bg-[var(--color-surface-highest)]">Overview</Link>
            <Link href="/admin/users" className="px-3 py-1.5 rounded-md text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-bg)] hover:bg-[var(--color-surface-high)] transition-colors">Users</Link>
            <Link href="/admin/records" className="px-3 py-1.5 rounded-md text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-bg)] hover:bg-[var(--color-surface-high)] transition-colors">Records</Link>
            <Link href="/admin/templates/pending" className="px-3 py-1.5 rounded-md text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-bg)] hover:bg-[var(--color-surface-high)] transition-colors flex items-center gap-2">
              Templates
              <span className="bg-[var(--color-warning)] text-[var(--color-surface)] text-[10px] px-1.5 py-0.5 rounded-full font-bold">3</span>
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Mock Search (UI only) */}
        {!isAdmin && (
          <div className="hidden sm:flex relative items-center">
            <Search className="absolute left-2.5 text-[var(--color-on-surface-variant)]" size={16} />
            <input 
              type="text" 
              placeholder="Search records..." 
              className="w-48 lg:w-64 h-9 pl-9 pr-3 rounded-full ghost-input text-sm text-[var(--color-on-bg)] focus:outline-none"
            />
          </div>
        )}
        
        <ThemeToggle />

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:bg-[var(--color-surface-low)] py-1 pl-1 pr-2 rounded-full transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-[var(--color-primary-container)] border border-[var(--color-primary)] text-[var(--color-primary)] flex items-center justify-center text-xs font-bold font-mono">
              {initials}
            </div>
            <span className="hidden sm:block text-sm text-[var(--color-on-surface-variant)] font-medium max-w-[100px] truncate">{user?.name || 'User'}</span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[var(--color-surface-highest)] border border-[var(--color-ghost-border)] rounded-md shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-[var(--color-ghost-border)]">
                <p className="text-sm font-medium text-[var(--color-on-bg)] truncate">{user?.name}</p>
                <p className="text-xs text-[var(--color-on-surface-variant)] truncate">{user?.email}</p>
                <p className="text-[10px] uppercase font-bold text-[var(--color-primary)] mt-1">{user?.role}</p>
              </div>
              <div className="py-1">
                <Link 
                  href="/profile" 
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-bg)] hover:bg-[var(--color-surface-high)]"
                >
                  <User size={16} /> Profile & Templates
                </Link>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-container)]/50"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
