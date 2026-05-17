import type { HTMLAttributes } from 'react';

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = '', ...rest }: SkeletonProps) {
  return <div className={`skeleton ${className}`.trim()} {...rest} />;
}
