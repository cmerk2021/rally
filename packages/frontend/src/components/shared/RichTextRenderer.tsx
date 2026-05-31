import { useMemo } from "react";

interface RichTextRendererProps {
  content: unknown;
  className?: string;
}

interface TipTapNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: TipTapNode[];
}

function renderInline(node: TipTapNode, key: number): React.ReactNode {
  if (node.type === "text") {
    let element: React.ReactNode = node.text ?? "";
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "bold") element = <strong key={`b${key}`}>{element}</strong>;
        else if (mark.type === "italic") element = <em key={`i${key}`}>{element}</em>;
        else if (mark.type === "code") element = <code key={`c${key}`}>{element}</code>;
        else if (mark.type === "underline") element = <u key={`u${key}`}>{element}</u>;
        else if (mark.type === "strike") element = <s key={`s${key}`}>{element}</s>;
        else if (mark.type === "link") {
          const href = String(mark.attrs?.href ?? "#");
          element = (
            <a key={`a${key}`} href={href} target="_blank" rel="noopener noreferrer">
              {element}
            </a>
          );
        }
      }
    }
    return element;
  }
  if (node.type === "hardBreak") return <br key={key} />;
  if (node.type === "mention") {
    const label = String(node.attrs?.label ?? node.attrs?.id ?? "");
    const entityType = String(node.attrs?.entityType ?? "");
    const id = String(node.attrs?.id ?? "");
    const href = entityType && id ? `/${entityType}s/${id}` : "#";
    return (
      <a key={key} href={href} className="entity-mention">
        @{label}
      </a>
    );
  }
  return null;
}

function renderNode(node: TipTapNode, key: number): React.ReactNode {
  const children = (node.content ?? []).map((c, i) => renderNode(c, i));
  const inline = (node.content ?? []).map((c, i) => renderInline(c, i));
  switch (node.type) {
    case "doc":
      return <>{children}</>;
    case "paragraph":
      return <p key={key}>{inline}</p>;
    case "heading": {
      const level = Number(node.attrs?.level ?? 1);
      const Tag = (`h${Math.min(Math.max(level, 1), 6)}`) as keyof JSX.IntrinsicElements;
      return <Tag key={key}>{inline}</Tag>;
    }
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{inline}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} />;
    case "image":
      return <img key={key} src={String(node.attrs?.src ?? "")} alt={String(node.attrs?.alt ?? "")} />;
    case "taskList":
      return <ul key={key} data-type="taskList">{children}</ul>;
    case "taskItem":
      return (
        <li key={key} data-type="taskItem">
          <input type="checkbox" defaultChecked={Boolean(node.attrs?.checked)} />
          <span>{inline.length ? inline : children}</span>
        </li>
      );
    default:
      if (node.text) return renderInline(node, key);
      return <div key={key}>{children}</div>;
  }
}

export function RichTextRenderer({ content, className }: RichTextRendererProps) {
  const rendered = useMemo(() => {
    if (!content) return null;
    let doc: TipTapNode | null = null;
    if (typeof content === "string") {
      try {
        doc = JSON.parse(content) as TipTapNode;
      } catch {
        return <p>{content}</p>;
      }
    } else if (typeof content === "object") {
      doc = content as TipTapNode;
    }
    if (!doc) return null;
    return renderNode(doc, 0);
  }, [content]);

  return <div className={`ProseMirror ${className ?? ""}`}>{rendered}</div>;
}
