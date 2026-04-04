import { useCallback, useRef, useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useTRPC } from "@/lib/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
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

const AVATAR_SIZE = 256;
const AVATAR_TEXT_SIZE = 120;
const AVATAR_COLORS = [
  "#0FACED", "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4",
];

async function getCroppedImage(imageSrc: string, crop: Area): Promise<string> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => { image.onload = resolve; });

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, 256, 256);
  return canvas.toDataURL("image/png").split(",")[1]!;
}

export function Profile() {
  const { data: session } = useSession();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const user = session?.user;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const username = (user as Record<string, unknown>)?.username as string
    ?? user?.email?.split("@")[0] ?? "";
  const [usernameValue, setUsernameValue] = useState(username);

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
        setCropImage(null);
        void queryClient.invalidateQueries();
      },
    }),
  );

  const updateUsername = useMutation(
    trpc.settings.updateUsername.mutationOptions({
      onSuccess: () => toast.success("Username updated"),
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteAccount = useMutation(
    trpc.settings.deleteAccount.mutationOptions({
      onSuccess: () => { window.location.href = "/"; },
    }),
  );

  const initials = username.slice(0, 2).toUpperCase() || "?";

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setCropImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleCropConfirm() {
    if (!cropImage || !croppedArea) return;
    const base64 = await getCroppedImage(cropImage, croppedArea);
    uploadAvatar.mutate({ data: base64 });
  }

  function handleColorAvatar(color: string) {
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const half = AVATAR_SIZE / 2;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${AVATAR_TEXT_SIZE}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, half, half);
    const base64 = canvas.toDataURL("image/png").split(",")[1];
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
                  onChange={handleFileSelect}
                />
                <p className="text-[11px] text-muted-foreground">PNG, JPG, or WebP. Max 2MB.</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Or pick a default</p>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorAvatar(color)}
                    className="h-8 w-8 rounded-full border-2 border-transparent hover:border-foreground transition-colors"
                    style={{ backgroundColor: color }}
                    aria-label={`Set ${color} avatar`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Username */}
        <Card>
          <CardHeader>
            <CardTitle>Username</CardTitle>
            <CardDescription>Your unique username across HowlBoard.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Label htmlFor="profile-username" className="sr-only">Username</Label>
              <Input
                id="profile-username"
                value={usernameValue}
                onChange={(e) => setUsernameValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="your-username"
                className="max-w-xs"
                minLength={3}
                maxLength={30}
              />
              <Button
                size="sm"
                disabled={usernameValue === username || !usernameValue.trim() || usernameValue.length < 3 || updateUsername.isPending}
                onClick={() => updateUsername.mutate({ username: usernameValue })}
              >
                {updateUsername.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Lowercase letters, numbers, and hyphens. 3-30 characters.
            </p>
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>Your account email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{user?.email ?? "—"}</p>
          </CardContent>
        </Card>

        {/* Role */}
        <Card>
          <CardHeader>
            <CardTitle>Role</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary capitalize">
              {(user as Record<string, unknown>)?.role as string ?? "member"}
            </span>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardContent className="pt-6">
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Sign out
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Delete Account</CardTitle>
            <CardDescription>
              Permanently delete your account and all data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              Delete my account
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Crop Dialog */}
      <Dialog open={!!cropImage} onOpenChange={() => setCropImage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop your avatar</DialogTitle>
            <DialogDescription>Drag and zoom to crop your image.</DialogDescription>
          </DialogHeader>
          <div className="relative h-64 w-full rounded-md overflow-hidden bg-black">
            {cropImage && (
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="round"
                showGrid={false}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCropImage(null)}>Cancel</Button>
            <Button size="sm" onClick={handleCropConfirm} disabled={uploadAvatar.isPending}>
              {uploadAvatar.isPending ? "Uploading…" : "Save avatar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>This will permanently delete everything.</DialogDescription>
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
