function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text: string): string {
  // Bold: **text**
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <article className="prose prose-invert prose-sm max-w-none text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_strong]:text-foreground [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("# ")) {
          return <h1 key={i}>{escapeHtml(trimmed.slice(2))}</h1>;
        }
        if (trimmed.startsWith("## ")) {
          return <h2 key={i}>{escapeHtml(trimmed.slice(3))}</h2>;
        }
        if (trimmed.startsWith("- ")) {
          return (
            <li
              key={i}
              dangerouslySetInnerHTML={{ __html: renderInline(trimmed.slice(2)) }}
            />
          );
        }
        if (trimmed === "") {
          return <br key={i} />;
        }
        return (
          <p
            key={i}
            dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }}
          />
        );
      })}
    </article>
  );
}
