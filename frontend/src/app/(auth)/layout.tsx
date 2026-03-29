export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[var(--color-primary-container)] to-[var(--color-secondary-container)]">
      {/* Animated Blobs Background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-secondary)]/10 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      {/* Glass Container */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 glass-card">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-serif font-bold text-[var(--color-on-bg)] mb-2">PaperTrail</h1>
          <p className="text-sm text-[var(--color-on-surface-variant)]">Government Document Digitisation</p>
        </div>
        
        {children}
      </div>
    </div>
  );
}
