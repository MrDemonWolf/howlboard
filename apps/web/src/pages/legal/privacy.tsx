import { useTRPC } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/logo";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Footer } from "@/components/footer";

export function PrivacyPolicy() {
  const trpc = useTRPC();
  const { data, isPending } = useQuery(
    trpc.settings.getLegalPage.queryOptions({ page: "privacy" }),
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
          <MarkdownRenderer content={data?.content ?? ""} />
        )}
      </main>
      <footer className="border-t border-border px-6 py-4">
        <Footer />
      </footer>
    </div>
  );
}
