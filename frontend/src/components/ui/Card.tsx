import type { HTMLAttributes } from 'react';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function Card({ interactive = false, className = '', children, ...rest }: CardProps) {
  const base = interactive ? 'glass-card-interactive' : 'glass-card';
  return (
    <div className={`${base} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
