import { useState } from "react";
import { Logo } from "@/components/logo";
import { Footer } from "@/components/footer";
import { signIn, signUp, twoFactor } from "@/lib/auth-client";
import { useTRPC } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Mode = "signin" | "signup";
type Step = "credentials" | "totp";

export function Login() {
  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState<Step>("credentials");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const trpc = useTRPC();
  const { data: regData } = useQuery(
    trpc.settings.getRegistrationEnabled.queryOptions(),
  );
  const registrationEnabled = regData?.enabled ?? false;

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await signUp.email({ email, password, name });
        if (res.error) {
          setError(res.error.message ?? "Sign up failed");
        }
      } else {
        const res = await signIn.email({
          email,
          password,
          callbackURL: "/",
        });
        if (res.error) {
          if (res.error.code === "TWO_FACTOR_REQUIRED") {
            setStep("totp");
          } else {
            setError(res.error.message ?? "Sign in failed");
          }
        }
      }
    } catch (err) {
      console.error("[HowlBoard] Auth error:", err);
      setError(err instanceof Error ? err.message : "Authentication failed. Check the console.");
    } finally {
      setLoading(false);
    }
  };

  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await twoFactor.verifyTotp({ code: totpCode });
      if (res.error) {
        setError(res.error.message ?? "Invalid code");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setName("");
    setEmail("");
    setPassword("");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size={64} />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            HowlBoard
          </CardTitle>
          <CardDescription>
            {step === "totp"
              ? "Enter your two-factor code"
              : mode === "signin"
                ? "Sign in to your account"
                : "Create your account"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === "credentials" ? (
            <>
              <form onSubmit={handleCredentials} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <Label htmlFor="login-name">Name</Label>
                    <Input
                      id="login-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Your name"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength={8}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading
                    ? "Please wait…"
                    : mode === "signin"
                      ? "Sign in"
                      : "Create account"}
                </Button>
              </form>

              <div className="text-center text-xs text-muted-foreground mt-6">
                {mode === "signin" ? (
                  registrationEnabled ? (
                    <>
                      Don&apos;t have an account?{" "}
                      <Button
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => switchMode("signup")}
                      >
                        Sign up
                      </Button>
                    </>
                  ) : (
                    <span>Registration is closed.</span>
                  )
                ) : (
                  <>
                    Already have an account?{" "}
                    <Button
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => switchMode("signin")}
                    >
                      Sign in
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleTotp} className="space-y-4">
              <div>
                <Label htmlFor="totp-code">Authenticator code</Label>
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  required
                  placeholder="000000"
                  autoFocus
                  className="tracking-widest text-center"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full"
              >
                {loading ? "Verifying…" : "Verify"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => { setStep("credentials"); setError(null); setTotpCode(""); }}
                className="w-full text-xs"
              >
                &larr; Back
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Footer className="mt-8" />
    </div>
  );
}
