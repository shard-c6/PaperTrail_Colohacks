"use client";

import { ScanText, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ThemeToggle';

export function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={clsx(
      "fixed top-0 w-full z-50 transition-all duration-300 px-6 lg:px-12",
      scrolled ? "h-16 bg-[var(--color-surface)]/80 backdrop-blur-md border-b border-[var(--color-ghost-border)] shadow-sm" : "h-20 bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <ScanText className="text-[var(--color-primary)] transition-transform group-hover:scale-110" size={24} />
          <span className="text-[22px] font-serif font-bold text-[var(--color-on-bg)]">PaperTrail</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          <Link href="/login" className="hidden sm:block text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] font-medium text-sm px-4">
            Sign In
          </Link>
          
          <Link href="/signup">
            <Button variant="primary" className="bg-white text-[var(--color-surface)] hover:bg-[var(--color-on-surface-variant)]">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
