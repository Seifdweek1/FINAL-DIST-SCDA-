import type { HTMLAttributes, ReactNode } from 'react';

export type AlertVariant = 'error' | 'success' | 'warning' | 'info';

const variants: Record<AlertVariant, string> = {
  error:
    'border-neon-magenta/35 bg-[rgba(236,72,153,0.08)] text-pink-100 shadow-[0_0_24px_-6px_rgba(236,72,153,0.25)]',
  success:
    'border-neon-green/35 bg-neon-green/5 text-emerald-100 shadow-[0_0_24px_-6px_rgba(34,197,94,0.2)]',
  warning:
    'border-neon-amber/40 bg-neon-amber/5 text-amber-100 shadow-[0_0_24px_-6px_rgba(245,158,11,0.18)]',
  info: 'border-neon-cyan/35 bg-neon-cyan/5 text-cyan-100 shadow-[0_0_24px_-6px_rgba(0,213,255,0.2)]',
};
export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
  title?: string;
  icon?: ReactNode;
};

export function Alert({
  variant = 'info',
  title,
  icon,
  className = '',
  children,
  role = 'alert',
  ...rest
}: AlertProps) {
  return (
    <div
      role={role}
      className={`flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed shadow-lg shadow-black/20 backdrop-blur-sm ${variants[variant]} ${className}`.trim()}
      {...rest}
    >
      {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
      <div className="min-w-0 flex-1">
        {title ? <div className="font-semibold text-white/95">{title}</div> : null}
        <div className={title ? 'mt-1' : ''}>{children}</div>
      </div>
    </div>
  );
}
