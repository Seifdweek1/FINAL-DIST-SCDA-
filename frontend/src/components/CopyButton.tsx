import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

type Props = {
  text: string;
  label?: string;
  className?: string;
};

export function CopyButton({ text, label = 'Copy', className = '' }: Props) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className={`btn-ghost inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-accent-purple/40 hover:text-white ${className}`.trim()}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-neon-green" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {copied ? 'Copied' : label}
    </button>
  );
}
