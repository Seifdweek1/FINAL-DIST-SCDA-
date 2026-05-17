import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const COLLAPSE_LEN = 520;

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

type Props = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

function stripDebugBlock(text: string): string {
  const marker = '--- DEBUG ---';
  const idx = text.indexOf(marker);
  if (idx === -1) return text;
  return text.slice(0, idx).trim();
}

export function ChatMessageBody({ role, content }: Props) {
  const [expanded, setExpanded] = useState(false);
  const displayContent = role === 'assistant' ? stripDebugBlock(content) : content;
  const isLong = displayContent.length > COLLAPSE_LEN;
  const shown = useMemo(() => {
    if (!isLong || expanded) return displayContent;
    return `${displayContent.slice(0, COLLAPSE_LEN).trim()}…`;
  }, [displayContent, expanded, isLong]);

  const blocks = shown.split(/\n\n+/);

  return (
    <div className="space-y-2">
      {blocks.map((block, idx) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        const bulletLines = lines.filter((l) => /^[•\-*]\s/.test(l));
        if (bulletLines.length >= 2) {
          return (
            <ul key={idx} className="space-y-2 text-sm leading-relaxed text-slate-200">
              {bulletLines.map((line, li) => (
                <li key={li} className="flex gap-2">
                  <span className="shrink-0 text-neon-cyan" aria-hidden>
                    •
                  </span>
                  <span>{renderInline(line.replace(/^[•\-*]\s*/, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
            {renderInline(block)}
          </p>
        );
      })}
      {isLong ? (
        <button
          type="button"
          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-neon-cyan hover:text-white"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              Show full answer
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
