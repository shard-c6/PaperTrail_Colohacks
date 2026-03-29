import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsBar } from "@/components/landing/StatsBar";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SplitViewPreview } from "@/components/landing/SplitViewPreview";
import { ScanText } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] flex flex-col pt-[env(safe-area-inset-top)] px-[env(safe-area-inset-left)]">
      <PublicNavbar />
      
      <HeroSection />
      <StatsBar />
      <HowItWorks />
      <SplitViewPreview />
      
      {/* Footer */}
      <footer className="border-t border-[var(--color-ghost-border)] bg-[var(--color-surface-lowest)] py-12 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <ScanText className="text-[var(--color-primary)]" size={20} />
            <span className="font-serif font-bold text-[var(--color-on-bg)] text-lg">PaperTrail</span>
            <span className="text-[var(--color-on-surface-variant)] text-sm ml-4 border-l border-[var(--color-ghost-border)] pl-4">
              Built for SDG 16 — Peace, Justice & Strong Institutions
            </span>
          </div>
          <div className="flex gap-6 text-sm text-[var(--color-on-surface-variant)]">
            <a href="#" className="hover:text-[var(--color-on-bg)] transition-colors">Home</a>
            <a href="#how-it-works" className="hover:text-[var(--color-on-bg)] transition-colors">How It Works</a>
            <a href="/login" className="hover:text-[var(--color-on-bg)] transition-colors">Sign In</a>
            <a href="/signup" className="hover:text-[var(--color-on-bg)] transition-colors">Sign Up</a>
          </div>
          <div className="text-sm text-[var(--color-on-surface-variant)]">
            © 2026 PaperTrail. Government use only.
          </div>
        </div>
      </footer>
    </main>
  );
}
