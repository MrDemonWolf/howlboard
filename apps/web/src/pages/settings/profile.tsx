import { useRef, useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useTRPC } from "@/lib/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const AVATAR_COLORS = [
  "#0FACED", "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4",
];

export function Profile() {
  const { data: session } = useSession();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const user = session?.user;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: avatarUrl } = useQuery(
    trpc.settings.getAvatar.queryOptions(
      { userId: user?.id ?? "" },
      { enabled: !!user?.id },
    ),
  );

  const uploadAvatar = useMutation(
    trpc.settings.uploadAvatar.mutationOptions({
      onSuccess: () => {
        toast.success("Avatar updated");
        void queryClient.invalidateQueries();
      },
    }),
  );

  const deleteAccount = useMutation(
    trpc.settings.deleteAccount.mutationOptions({
      onSuccess: () => {
        toast.success("Account deleted");
        window.location.href = "/";
      },
    }),
  );

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      if (base64) uploadAvatar.mutate({ data: base64 });
    };
    reader.readAsDataURL(file);
  }

  function handleColorAvatar(color: string) {
    // Generate a colored circle SVG as PNG via canvas
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 120px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, 128, 128);
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    if (base64) uploadAvatar.mutate({ data: base64 });
  }

  return (
    <DashboardLayout>
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">My Profile</h1>
      </div>

      <div className="max-w-2xl px-6 py-6 space-y-6">
        {/* Avatar */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>Upload a custom image or pick a color.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar size="lg">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Avatar" />
                ) : (
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                )}
              </Avatar>
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAvatar.isPending}
                >
                  {uploadAvatar.isPending ? "Uploading…" : "Upload image"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <p className="text-[11px] text-muted-foreground">PNG, JPG, or WebP. Max 2MB.</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Or pick a default</p>
              <div className="flex gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorAvatar(color)}
                    className="h-8 w-8 rounded-full border-2 border-transparent hover:border-foreground transition-colors"
                    style={{ backgroundColor: color }}
                    title={`Set ${color} avatar`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Name */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Name</CardTitle>
            <CardDescription>Change your display name.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Label htmlFor="profile-name" className="sr-only">Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="max-w-xs"
              />
              <Button
                size="sm"
                disabled={name === user?.name || !name.trim()}
                onClick={() => toast.info("Profile name update coming soon")}
              >
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader>
            <CardTitle>Account Email</CardTitle>
            <CardDescription>Your account email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{user?.email ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Email cannot be changed at this time.
            </p>
          </CardContent>
        </Card>

        {/* Role */}
        <Card>
          <CardHeader>
            <CardTitle>Role</CardTitle>
            <CardDescription>Your role in this HowlBoard instance.</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary capitalize">
              {(user as Record<string, unknown>)?.role as string ?? "member"}
            </span>
          </CardContent>
        </Card>

        <Separator />

        {/* Sign out */}
        <Card>
          <CardHeader>
            <CardTitle>Sign Out</CardTitle>
            <CardDescription>Sign out of your account on this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Sign out
            </Button>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Delete Account</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              Delete my account
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all boards, and all data.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertDescription>This action cannot be undone.</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" disabled={deleteAccount.isPending} onClick={() => deleteAccount.mutate()}>
              {deleteAccount.isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
