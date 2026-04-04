import { useTRPC } from "@/lib/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export function Settings() {
  const trpc = useTRPC();

  const { data: regData } = useQuery(
    trpc.settings.getRegistrationEnabled.queryOptions(),
  );
  const updateReg = useMutation(
    trpc.settings.updateRegistration.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.enabled ? "Registration enabled" : "Registration disabled");
      },
    }),
  );

  return (
    <DashboardLayout>
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
      </div>

      <div className="max-w-2xl px-6 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Registration</CardTitle>
            <CardDescription>
              Control whether new users can create accounts on this instance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="reg-toggle">Allow new registrations</Label>
              <Switch
                id="reg-toggle"
                checked={regData?.enabled ?? false}
                onCheckedChange={(checked) => updateReg.mutate({ enabled: checked })}
                disabled={updateReg.isPending}
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>Instance</CardTitle>
            <CardDescription>
              Information about this HowlBoard instance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Version: 0.1.0</p>
            <p>Platform: Cloudflare Workers</p>
            <p>Storage: R2 + D1</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
