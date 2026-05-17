import type { HTMLAttributes } from 'react';

export function TableShell({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`table-wrap overflow-x-auto ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
