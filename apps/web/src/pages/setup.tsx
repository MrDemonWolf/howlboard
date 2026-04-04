import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Logo } from "@/components/logo";
import { Footer } from "@/components/footer";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function Setup() {
  const [searchParams] = useSearchParams();
  const isDev = searchParams.get("dev") === "true" && window.location.hostname === "localhost";

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dev mode: auto-fill form fields
  useEffect(() => {
    if (isDev) {
      setName("Dev Admin");
      setUsername("admin");
      setEmail("dev@howlboard.local");
      setPassword("password123");
    }
  }, [isDev]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signUp.email({ email, password, name });
      if (res.error) {
        setError(res.error.message ?? "Setup failed");
      } else {
        // Full reload to clear cached getSetupStatus query
        window.location.href = "/";
      }
    } catch (err) {
      console.error("[HowlBoard] Setup error:", err);
      setError(err instanceof Error ? err.message : "Setup failed. Check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size={64} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Set up HowlBoard
          </CardTitle>
          <CardDescription>
            Create your admin account to get started. This will be the only
            account unless you enable registration later.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="setup-name">Your name</Label>
              <Input
                id="setup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="setup-username">Username</Label>
              <Input
                id="setup-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                required
                minLength={3}
                maxLength={30}
                placeholder="your-username"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>
            <div>
              <Label htmlFor="setup-email">Email</Label>
              <Input
                id="setup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="setup-password">Password</Label>
              <Input
                id="setup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating account…" : "Create admin account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Footer className="mt-8" />
    </div>
  );
}
