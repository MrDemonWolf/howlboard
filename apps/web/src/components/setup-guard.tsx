import type { ReactNode } from "react";
import { useLocation, Navigate } from "react-router";
import { useTRPC } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { FullPageSpinner } from "@/components/ui/loading-spinner";

const SETUP_EXEMPT = ["/setup"];

export function SetupGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const trpc = useTRPC();

  const { data, isPending } = useQuery(
    trpc.settings.getSetupStatus.queryOptions(),
  );

  if (isPending) {
    return <FullPageSpinner />;
  }

  if (!data?.isComplete && !SETUP_EXEMPT.includes(location.pathname)) {
    return <Navigate to="/setup" replace />;
  }

  if (data?.isComplete && location.pathname === "/setup") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
