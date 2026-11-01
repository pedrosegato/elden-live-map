import { useMemo } from "react";
import { renderMarkdown } from "@/lib/markdown";

interface MarkdownTextProps {
  text: string;
}

export function MarkdownText({ text }: MarkdownTextProps) {
  const content = useMemo(() => renderMarkdown(text), [text]);
  return <div className="markdown">{content}</div>;
}
