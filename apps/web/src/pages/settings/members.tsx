import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth-client";

export function Members() {
  const { data: session } = useSession();
  const user = session?.user;

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Members</h1>
        <Button size="sm" onClick={() => {}}>
          Invite user
        </Button>
      </div>

      <div className="max-w-2xl px-6 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              People with access to this HowlBoard instance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              <div className="flex items-center gap-3 py-3">
                <Avatar size="sm">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <Badge variant="outline">
                  {(user as Record<string, unknown>)?.role as string ?? "member"}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  You
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invite</CardTitle>
            <CardDescription>
              Invite teammates or clients to collaborate on boards. They'll receive an email
              invitation to create an account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Invitation system coming soon. For now, enable registration in Settings
              and share the sign-up link.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
