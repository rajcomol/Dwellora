"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const mdComponents = {
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mb-1.5 mt-2 text-sm font-semibold first:mt-0">{children}</h3>
  ),
  p: ({ children }: { children?: ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      className="font-medium text-renovation-steel underline decoration-renovation-accent/50 underline-offset-2 hover:text-renovation-accent dark:text-cyan-300/90"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const inline = !className;
    if (inline) {
      return (
        <code className="rounded bg-renovation-surface px-1 py-0.5 font-mono text-[0.85em] text-foreground dark:bg-renovation-muted dark:text-foreground">
          {children}
        </code>
      );
    }
    return <code className={className}>{children}</code>;
  },
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg bg-renovation-surface p-3 font-mono text-[0.85em] text-foreground last:mb-0 dark:bg-renovation-muted dark:text-foreground">
      {children}
    </pre>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-2 border-l-2 border-renovation-border pl-3 text-foreground last:mb-0 dark:border-renovation-border dark:text-foreground">
      {children}
    </blockquote>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="mb-2 max-w-full overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => <thead className="border-b border-renovation-border dark:border-renovation-border">{children}</thead>,
  th: ({ children }: { children?: ReactNode }) => (
    <th className="border border-renovation-border px-2 py-1.5 font-semibold dark:border-renovation-border">{children}</th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="border border-renovation-border px-2 py-1.5 align-top dark:border-renovation-border">{children}</td>
  ),
};

export default function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed text-inherit">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
