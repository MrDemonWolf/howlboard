import { useState } from "react";
import { useTRPC } from "@/lib/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

function LegalEditor({ page, title, description }: {
  page: "tos" | "privacy";
  title: string;
  description: string;
}) {
  const trpc = useTRPC();
  const { data } = useQuery(
    trpc.settings.getLegalPage.queryOptions({ page }),
  );
  const [content, setContent] = useState<string | null>(null);

  const updatePage = useMutation(
    trpc.settings.updateLegalPage.mutationOptions({
      onSuccess: () => toast.success(`${title} updated`),
    }),
  );

  const currentContent = content ?? data?.content ?? "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              asChild
            >
              <a href={page === "tos" ? "/legal/terms" : "/legal/privacy"} target="_blank">
                Preview
              </a>
            </Button>
            <Button
              size="sm"
              disabled={updatePage.isPending || content === null}
              onClick={() => updatePage.mutate({ page, content: currentContent })}
            >
              {updatePage.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Label htmlFor={`legal-${page}`} className="sr-only">{title} content</Label>
        <textarea
          id={`legal-${page}`}
          value={currentContent}
          onChange={(e) => setContent(e.target.value)}
          rows={16}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-y"
          placeholder="Write your policy in Markdown..."
        />
      </CardContent>
    </Card>
  );
}

export function LegalSettings() {
  return (
    <DashboardLayout>
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Legal Pages</h1>
      </div>

      <div className="max-w-3xl px-6 py-6 space-y-6">
        <LegalEditor
          page="tos"
          title="Terms of Service"
          description="Edit the Terms of Service shown at /legal/terms. Uses Markdown formatting."
        />

        <Separator />

        <LegalEditor
          page="privacy"
          title="Privacy Policy"
          description="Edit the Privacy Policy shown at /legal/privacy. Uses Markdown formatting."
        />
      </div>
    </DashboardLayout>
  );
}
