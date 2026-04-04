import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useSession } from "@/lib/auth-client";
import { FullPageSpinner } from "@/components/ui/loading-spinner";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { data: session, isPending, error } = useSession();

  if (isPending) {
    return <FullPageSpinner />;
  }

  if (error || !session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
