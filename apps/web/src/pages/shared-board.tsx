import "@excalidraw/excalidraw/index.css";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { useTRPC } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FullPageSpinner, LoadingSpinner } from "@/components/ui/loading-spinner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ExcalidrawComponent: any = null;

export function SharedBoard() {
  const { token } = useParams<{ token: string }>();
  const trpc = useTRPC();
  const [excalidrawLoaded, setExcalidrawLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const excalidrawAPIRef = useRef<any>(null);

  const { data, isLoading } = useQuery(
    trpc.boards.getByShareToken.queryOptions(
      { token: token! },
      { enabled: !!token },
    ),
  );

  useEffect(() => {
    import("@excalidraw/excalidraw").then((mod) => {
      ExcalidrawComponent = mod.Excalidraw;
      setExcalidrawLoaded(true);
    });
  }, []);

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Logo size={48} />
        <p className="text-sm text-muted-foreground">
          This link is invalid, expired, or has reached its usage limit.
        </p>
      </div>
    );
  }

  const initialData = (() => {
    try {
      return data.sceneData ? JSON.parse(data.sceneData) : null;
    } catch {
      return null;
    }
  })();

  const isReadOnly = data.permission === "view";

  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <Logo size={24} />
          <span className="text-sm font-medium text-foreground">{data.board.title}</span>
          {isReadOnly && (
            <Badge variant="outline">View only</Badge>
          )}
        </div>
        <Button variant="link" size="sm" asChild>
          <a href="/login">Sign in to HowlBoard</a>
        </Button>
      </div>

      <div className="flex-1">
        {excalidrawLoaded && ExcalidrawComponent ? (
          <ExcalidrawComponent
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            excalidrawAPI={(api: any) => { excalidrawAPIRef.current = api; }}
            initialData={initialData}
            viewModeEnabled={isReadOnly}
            theme="light"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner />
          </div>
        )}
      </div>
    </div>
  );
}
