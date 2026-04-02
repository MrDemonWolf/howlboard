import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useSession } from "@/lib/auth-client";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-howl-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-howl-cyan border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
