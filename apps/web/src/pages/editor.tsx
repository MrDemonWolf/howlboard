import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useTRPC } from "@/lib/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";

// Lazy-load Excalidraw to reduce initial bundle
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ExcalidrawComponent: any = null;

export function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const [excalidrawLoaded, setExcalidrawLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const excalidrawAPIRef = useRef<any>(null);

  const { data: board } = useQuery(
    trpc.boards.getById.queryOptions(
      { id: id! },
      { enabled: !!id },
    ),
  );
  const { data: sceneData } = useQuery(
    trpc.boards.loadDrawing.queryOptions(
      { id: id! },
      { enabled: !!id },
    ),
  );
  const saveDrawing = useMutation(trpc.boards.saveDrawing.mutationOptions());

  // Dynamically import Excalidraw
  useEffect(() => {
    import("@excalidraw/excalidraw").then((mod) => {
      ExcalidrawComponent = mod.Excalidraw;
      setExcalidrawLoaded(true);
    });
  }, []);

  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly any[], appState: any, files: any) => {
      if (!id) return;

      // Debounce save — 2 seconds after last change
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        const data = JSON.stringify({
          type: "excalidraw",
          version: 2,
          source: "howlboard",
          elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            gridSize: appState.gridSize,
          },
          files,
        });

        saveDrawing.mutate({ id, data });
      }, 2000);
    },
    [id, saveDrawing],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const initialData = sceneData ? JSON.parse(sceneData as string) : null;

  if (!board) {
    return (
      <div className="flex h-screen items-center justify-center bg-howl-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-howl-cyan border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Minimal toolbar */}
      <div className="flex items-center justify-between border-b bg-howl-surface px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-howl-muted transition-colors hover:text-white"
          >
            &larr; Back
          </button>
          <span className="text-sm font-medium text-white">{board.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {saveDrawing.isPending && (
            <span className="text-xs text-howl-muted">Saving...</span>
          )}
          {saveDrawing.isSuccess && (
            <span className="text-xs text-green-400">Saved</span>
          )}
        </div>
      </div>

      {/* Excalidraw canvas */}
      <div className="flex-1">
        {excalidrawLoaded && ExcalidrawComponent ? (
          <ExcalidrawComponent
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ref={(api: any) => {
              excalidrawAPIRef.current = api;
            }}
            initialData={initialData}
            onChange={handleChange}
            theme="light"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-howl-cyan border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );
}
