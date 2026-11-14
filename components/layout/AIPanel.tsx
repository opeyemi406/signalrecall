"use client";

import * as React from "react";
import { RotateCcw, X, Send } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { askAssistant } from "@/lib/ai";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/Logo";

export interface AIPanelProps {
  onClose?: () => void;
  className?: string;
}

const SUGGESTIONS = [
  "Summarize today's market sentiment",
  "Analyze BTC Trend",
  "What do you remember about SOL?",
];

function parseInlineFormatting(str: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match **bold** or *italic*
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIdx) {
      parts.push(str.substring(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={`em-${match.index}`} className="text-white/80 italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < str.length) {
    parts.push(str.substring(lastIdx));
  }

  return parts.length > 0 ? parts : [str];
}

function FormattedMessage({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      nodes.push(
        <ul key={`ul-${nodes.length}`} className="my-2 space-y-1.5 pl-0.5">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    // Markdown headers (### or ## or #)
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      flushList();
      nodes.push(
        <div key={`h-${lineIdx}`} className="mt-2.5 mb-1 text-[13px] font-semibold text-white tracking-wide">
          {parseInlineFormatting(headerMatch[2])}
        </div>
      );
      return;
    }

    // Bullet points (- or * or •)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      currentList.push(
        <li key={`li-${lineIdx}`} className="flex items-start gap-2 text-white/90">
          <span className="text-electric shrink-0 leading-[18px] text-[10px] select-none">•</span>
          <span className="flex-1 leading-relaxed">{parseInlineFormatting(bulletMatch[1])}</span>
        </li>
      );
      return;
    }

    flushList();
    nodes.push(
      <p key={`p-${lineIdx}`} className="leading-relaxed">
        {parseInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-2">{nodes}</div>;
}

export function AIPanel({ onClose, className }: AIPanelProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (promptText?: string) => {
    const text = (promptText ?? input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setInput("");
    setLoading(true);

    try {
      const reply = await askAssistant(text);
      setMessages((prev) => [...prev, reply]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <aside
      aria-label="SignalRecall AI Assistant"
      className={cn(
        "ai-panel-bg relative flex h-full w-full flex-col justify-between overflow-hidden rounded-3xl border border-white/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]",
        className
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* SignalRecall squircle logomark */}
          <LogoMark size={32} id="aiPanelLogoMark" />
          <div>
            <div className="text-sm font-semibold text-white leading-tight">
              SignalRecall AI
            </div>
            <div className="text-[11px] text-fg-2 leading-tight">
              Memory-powered
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset conversation"
            className="glass-pill inline-flex size-7 items-center justify-center rounded-full text-fg-2 hover:text-white transition-colors"
          >
            <RotateCcw className="size-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI panel"
              className="glass-pill inline-flex size-7 items-center justify-center rounded-full text-fg-2 hover:text-white transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Headline & Conversation Stream */}
      <div
        ref={scrollRef}
        className="scroll-panel my-4 flex-1 overflow-y-auto pr-1 space-y-4"
      >
        <div className="pt-2">
          <h2 className="text-[26px] leading-[1.2] font-medium tracking-tight text-white">
            Meet SignalRecall AI
            <span className="block text-white/40">
              Your Intelligent{" "}
              <span className="text-white font-medium">Trading Partner.</span>
            </span>
          </h2>
        </div>

        {messages.length === 0 ? (
          <p className="text-sm leading-relaxed text-fg-2 pt-2">
            Ask about any asset, chart setup, or upcoming macro event. Every answer recalls past market reactions and verified outcomes stored on Walrus.
          </p>
        ) : (
          <div className="space-y-3 pt-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "rounded-2xl p-3.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-6 bg-white/12 text-white border border-white/15"
                    : "mr-2 glass text-white/90"
                )}
              >
                {m.role === "user" ? (
                  <div className="whitespace-pre-line">{m.content}</div>
                ) : (
                  <FormattedMessage content={m.content} />
                )}

                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
                    {m.citations.map((c) => (
                      <span
                        key={c.blobId}
                        className="inline-flex items-center gap-1 rounded-full bg-electric/20 border border-electric/35 px-2 py-0.5 text-[10px] text-white num"
                      >
                        <span>{c.label}</span>
                        <span className="text-white/60">({c.blobId})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="glass rounded-2xl p-3.5 text-xs text-fg-2 flex items-center gap-2">
                <RotateCcw className="size-3.5 text-electric animate-spin" />
                <span>Analyzing live market data & Walrus memory…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Suggestion Chips + Input Pill */}
      <div className="space-y-3 pt-2 min-w-0 max-w-full">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar min-w-0 max-w-full">
          {SUGGESTIONS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => handleSend(label)}
              className="glass-pill shrink-0 inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span>{label}</span>
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="glass-pill flex items-center gap-2 rounded-full p-1.5 pl-3.5 border border-white/15 bg-white/[0.06]"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI anything..."
            aria-label="Ask SignalRecall AI anything"
            className="flex-1 bg-transparent text-xs text-white placeholder:text-fg-2 outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            aria-label="Send message"
            className="btn-primary inline-flex size-8 shrink-0 items-center justify-center rounded-full"
          >
            <Send className="size-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
}
