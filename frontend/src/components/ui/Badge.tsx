import type { HTMLAttributes } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const variants: Record<BadgeVariant, string> = {
  success:
    'border border-neon-green/40 bg-neon-green/10 text-neon-green shadow-[0_0_12px_-2px_rgba(34,197,94,0.25)]',
  warning:
    'border border-neon-amber/40 bg-neon-amber/10 text-neon-amber shadow-[0_0_12px_-2px_rgba(245,158,11,0.2)]',
  error:
    'border border-neon-magenta/45 bg-neon-magenta/10 text-pink-300 shadow-[0_0_14px_-2px_rgba(236,72,153,0.3)]',
  info: 'border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan shadow-[0_0_12px_-2px_rgba(0,213,255,0.2)]',
  neutral: 'border border-slate-500/35 bg-slate-500/10 text-slate-300',
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = 'neutral', className = '', children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${variants[variant]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </span>
  );
}
