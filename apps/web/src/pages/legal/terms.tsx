import { useTRPC } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/logo";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function TermsOfService() {
  const trpc = useTRPC();
  const { data, isPending } = useQuery(
    trpc.settings.getLegalPage.queryOptions({ page: "tos" }),
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Logo size={24} />
          <a href="/" className="text-sm font-bold text-foreground hover:text-primary transition-colors">
            HowlBoard
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        {isPending ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : (
          <article className="prose prose-invert prose-sm max-w-none text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
            {data?.content.split("\n").map((line, i) => {
              if (line.startsWith("# ")) return <h1 key={i}>{line.slice(2)}</h1>;
              if (line.startsWith("## ")) return <h2 key={i}>{line.slice(3)}</h2>;
              if (line.startsWith("- **")) {
                const match = line.match(/^- \*\*(.+?)\*\*:?\s*(.*)/);
                if (match) return <li key={i}><strong>{match[1]}</strong>{match[2] ? `: ${match[2]}` : ""}</li>;
              }
              if (line.startsWith("- ")) return <li key={i}>{line.slice(2)}</li>;
              if (line.startsWith("**")) return <p key={i}><strong>{line.replace(/\*\*/g, "")}</strong></p>;
              if (line.trim() === "") return <br key={i} />;
              return <p key={i}>{line}</p>;
            })}
          </article>
        )}
      </main>
      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} MrDemonWolf, Inc. All rights reserved.
      </footer>
    </div>
  );
}
