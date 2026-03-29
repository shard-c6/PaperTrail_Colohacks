import { forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center font-semibold rounded-md transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    
    const variants = {
      primary: "bg-[var(--color-on-surface)] text-[var(--color-surface)] hover:bg-[var(--color-on-bg)] focus-visible:ring-[var(--color-primary)]",
      secondary: "bg-[var(--color-surface-highest)] text-[var(--color-on-bg)] border border-[var(--color-ghost-border)] hover:bg-[var(--color-surface-high)] hover:border-[var(--color-glow)] hover:shadow-[0_0_15px_var(--color-glow)] focus-visible:ring-[var(--color-primary)] glass-button",
      destructive: "bg-[var(--color-error)] text-[#ffffff] hover:bg-[var(--color-error-container)] focus-visible:ring-[var(--color-error)]",
      ghost: "bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-surface-highest)] hover:text-[var(--color-on-bg)] focus-visible:ring-[var(--color-primary)]",
      icon: "bg-[var(--color-surface-low)] text-[var(--color-on-bg)] rounded-full hover:bg-[var(--color-surface-highest)] focus-visible:ring-[var(--color-primary)]"
    };

    const sizes = {
      sm: "h-9 px-3 text-xs",
      md: "h-11 px-5 text-sm",
      lg: "h-14 px-8 text-base rounded-xl",
      icon: "h-10 w-10 p-0"
    };

    return (
      <button
        ref={ref}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && variant === 'icon' ? children : (!isLoading ? children : null)}
        {isLoading && variant !== 'icon' && "Loading..."}
      </button>
    );
  }
);
Button.displayName = 'Button';
