type SpinnerProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
};

export function Spinner({ className = '', size = 'md', label = 'Loading' }: SpinnerProps) {
  const dim =
    size === 'sm' ? 'h-4 w-4 border' : size === 'lg' ? 'h-12 w-12 border-[3px]' : 'h-8 w-8 border-2';
  return (
    <span
      className={`inline-block animate-spin rounded-full border-neon-cyan border-t-transparent ${dim} ${className}`.trim()}
      role="status"
      aria-label={label}
    />
  );
}
