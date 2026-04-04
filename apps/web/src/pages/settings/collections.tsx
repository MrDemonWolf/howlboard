import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CollectionsSettings() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Collections</h1>
        <Button size="sm" onClick={() => {}}>
          + New Collection
        </Button>
      </div>

      <div className="max-w-2xl px-6 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Collections</CardTitle>
            <CardDescription>
              Organize your boards into collections for easier management.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No collections yet. Create one to start organizing your boards.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
