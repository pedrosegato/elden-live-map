import MarkdownIt from "markdown-it";
import { createElement, Fragment, type ReactNode } from "react";

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true });

type Token = ReturnType<typeof markdown.parse>[number];
const RENDERED_TAGS = new Set(["p", "ul", "ol", "li", "strong", "em", "s", "blockquote", "h3", "h4", "h5", "h6"]);
const DEMOTED_HEADINGS: Record<string, string> = { h1: "h3", h2: "h4" };

interface OpenNode {
  tag: string;
  attributes: Record<string, string | number>;
  children: ReactNode[];
}

function toElement({ tag, attributes, children }: OpenNode, key: string): ReactNode {
  if (tag === "a") {
    const href = String(attributes.href ?? "");
    const internal = href.startsWith("#");
    return (
      <a
        key={key}
        href={href}
        target={internal ? undefined : "_blank"}
        rel={internal ? undefined : "noopener noreferrer"}
      >
        {children}
      </a>
    );
  }
  const rendered = DEMOTED_HEADINGS[tag] ?? tag;
  if (!RENDERED_TAGS.has(rendered)) return <Fragment key={key}>{children}</Fragment>;
  return createElement(rendered, { key }, ...children);
}

function buildTree(tokens: Token[], keyPrefix: string): ReactNode[] {
  const root: ReactNode[] = [];
  const stack: OpenNode[] = [];
  const append = (...nodes: ReactNode[]) => (stack.at(-1)?.children ?? root).push(...nodes);

  tokens.forEach((token, index) => {
    const key = `${keyPrefix}.${index}`;
    if (token.type === "inline") {
      append(...buildTree(token.children ?? [], key));
    } else if (token.type === "text") {
      append(token.content);
    } else if (token.type === "softbreak" || token.type === "hardbreak") {
      append(<br key={key} />);
    } else if (token.type === "code_inline") {
      append(<code key={key}>{token.content}</code>);
    } else if (token.nesting === 1) {
      stack.push({ tag: token.tag, attributes: Object.fromEntries(token.attrs ?? []), children: [] });
    } else if (token.nesting === -1) {
      const node = stack.pop();
      if (node) append(toElement(node, key));
    }
  });
  return root;
}

export function renderMarkdown(text: string): ReactNode[] {
  return buildTree(markdown.parse(text, {}), "md");
}
