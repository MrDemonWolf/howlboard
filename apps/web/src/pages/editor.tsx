import "@excalidraw/excalidraw/index.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useTRPC } from "@/lib/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { FullPageSpinner } from "@/components/ui/loading-spinner";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LOCAL_STORAGE_KEY = "howlboard-local-scene";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ExcalidrawComponent: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let MainMenu: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let exportToBlob: any = null;

function useSystemTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return theme;
}

function timeAgo(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

export function Editor() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const { data: session } = useSession();
  const systemTheme = useSystemTheme();
  const [excalidrawLoaded, setExcalidrawLoaded] = useState(false);
  const [parseError, setParseError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastThumbnailRef = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);

  const isLocalMode = !id;

  // Queries
  const { data: board } = useQuery(
    trpc.boards.getById.queryOptions({ id: id! }, { enabled: !!id }),
  );
  const { data: sceneData, isPending: sceneLoading } = useQuery(
    trpc.boards.loadDrawing.queryOptions({ id: id! }, { enabled: !!id }),
  );

  // Board list for sidebar panel
  const { data: allBoards } = useQuery(
    trpc.boards.list.queryOptions(undefined, { enabled: !!session, staleTime: 1000 * 30 }),
  );

  // Mutations (stable refs)
  const saveDrawing = useMutation(trpc.boards.saveDrawing.mutationOptions());
  const saveThumbnail = useMutation(trpc.boards.saveThumbnail.mutationOptions());
  const updateBoard = useMutation(trpc.boards.update.mutationOptions());
  const saveDrawingRef = useRef(saveDrawing);
  saveDrawingRef.current = saveDrawing;
  const saveThumbnailRef = useRef(saveThumbnail);
  saveThumbnailRef.current = saveThumbnail;
  const idRef = useRef(id);
  idRef.current = id;

  const createBoard = useMutation(
    trpc.boards.create.mutationOptions({
      onSuccess: (newBoard) => {
        if (!newBoard) return;
        const api = apiRef.current;
        if (api) {
          saveDrawingRef.current.mutate(
            { id: newBoard.id, data: getSceneJSON(api) },
            { onSuccess: () => { window.location.href = `/board/${newBoard.id}`; } },
          );
        } else {
          window.location.href = `/board/${newBoard.id}`;
        }
      },
    }),
  );

  // Load Excalidraw
  useEffect(() => {
    import("@excalidraw/excalidraw").then((mod) => {
      ExcalidrawComponent = mod.Excalidraw;
      MainMenu = mod.MainMenu;
      exportToBlob = mod.exportToBlob;
      setExcalidrawLoaded(true);
    });
  }, []);

  // Tick "last saved X ago" every 10s
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getSceneJSON(api: any): string {
    const appState = api.getAppState();
    return JSON.stringify({
      type: "excalidraw",
      version: 2,
      source: "howlboard",
      elements: api.getSceneElements(),
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        gridSize: appState.gridSize,
      },
      files: api.getFiles(),
    });
  }

  function generateThumbnail() {
    if (!exportToBlob || !apiRef.current || !idRef.current) return;
    const now = Date.now();
    if (now - lastThumbnailRef.current < 30_000) return;
    lastThumbnailRef.current = now;
    const api = apiRef.current;
    exportToBlob({
      elements: api.getSceneElements(),
      appState: { ...api.getAppState(), exportWithDarkMode: false },
      files: api.getFiles(),
      maxWidthOrHeight: 400,
    })
      .then((blob: Blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = (reader.result as string).split(",")[1];
          if (b64 && idRef.current) saveThumbnailRef.current.mutate({ id: idRef.current, data: b64 });
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
  }

  // Core save (uses refs, never stale)
  function saveToCloud(data: string, showToast = false) {
    const boardId = idRef.current;
    if (!boardId) return;
    saveDrawingRef.current.mutate(
      { id: boardId, data },
      {
        onSuccess: () => {
          setDirty(false);
          setLastSaved(Date.now());
          if (showToast) toast.success("Saved");
          generateThumbnail();
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Unknown error";
          toast.error("Save failed", { description: msg });
        },
      },
    );
  }

  function handleSaveNow() {
    if (!idRef.current || !apiRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveToCloud(getSceneJSON(apiRef.current), true);
  }

  // Debounced onChange (auto-save, silent)
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_elements: readonly any[], _appState: any, _files: any) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setDirty(true);

      debounceRef.current = setTimeout(() => {
        const api = apiRef.current;
        if (!api) return;
        const data = getSceneJSON(api);

        if (!idRef.current) {
          try { localStorage.setItem(LOCAL_STORAGE_KEY, data); } catch { /* quota */ }
          setDirty(false);
        } else {
          saveToCloud(data, false); // silent auto-save
        }
      }, 1500);
    },
    [],
  );

  // Periodic save every 10s
  useEffect(() => {
    if (isLocalMode || !id) return;
    const interval = setInterval(() => {
      if (apiRef.current && idRef.current) {
        saveToCloud(getSceneJSON(apiRef.current), false);
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [id, isLocalMode]);

  // Ctrl/Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveNow();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function handleSaveToCloud() {
    if (!session) { navigate("/login"); return; }
    createBoard.mutate({ title: "Untitled" });
  }

  async function handleExportPNG() {
    if (!apiRef.current || !exportToBlob) return;
    const api = apiRef.current;
    const blob = await exportToBlob({
      elements: api.getSceneElements(),
      appState: api.getAppState(),
      files: api.getFiles(),
      mimeType: "image/png",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${board?.title ?? "drawing"}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as PNG");
  }

  function handleRename() {
    const current = board?.title ?? "Untitled";
    const newTitle = prompt("Rename board:", current);
    if (newTitle && newTitle.trim() && id) {
      updateBoard.mutate({ id, title: newTitle.trim() });
      toast.success("Renamed");
    }
  }

  // Cleanup
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Initial data
  const initialData = (() => {
    const raw = isLocalMode
      ? localStorage.getItem(LOCAL_STORAGE_KEY)
      : (sceneData as string | null | undefined);
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch { setParseError(true); return null; }
  })();

  // Guards
  if (!isLocalMode && (!board || sceneLoading)) return <FullPageSpinner />;

  if (parseError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="text-sm text-muted-foreground">Failed to load drawing data.</p>
        <Button variant="link" onClick={() => navigate("/")}>
          &larr; Back to dashboard
        </Button>
      </div>
    );
  }

  // Status text for menu
  const statusText = dirty
    ? "● Unsaved changes"
    : lastSaved
      ? `✓ Saved ${timeAgo(lastSaved)}`
      : "✓ Up to date";

  return (
    <div className="flex h-screen w-screen">
      {/* Board panel */}
      {!isLocalMode && panelOpen && (
        <aside className="flex h-full w-52 flex-col border-r border-border bg-card shrink-0">
          <div className="flex items-center justify-between px-3 py-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate("/")}>
              ◀ Dashboard
            </Button>
            <button
              onClick={() => setPanelOpen(false)}
              className="text-muted-foreground hover:text-foreground text-xs px-1"
              title="Close panel"
            >
              ✕
            </button>
          </div>
          <Separator />
          <div className="flex-1 overflow-y-auto py-1">
            {allBoards?.map((b) => (
              <button
                key={b.id}
                onClick={() => { window.location.href = `/board/${b.id}`; }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                  b.id === id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span className="truncate">{b.title}</span>
              </button>
            ))}
          </div>
          <Separator />
          <div className="px-2 py-2">
            <Button
              size="sm"
              className="w-full text-xs h-7"
              onClick={() => createBoard.mutate({ title: "Untitled" })}
              disabled={createBoard.isPending}
            >
              + New Board
            </Button>
          </div>
        </aside>
      )}

      {/* Canvas */}
      <div className="flex-1 relative">
        {/* Panel toggle button (when closed) */}
        {!isLocalMode && !panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="absolute top-2 left-2 z-10 rounded-md bg-card/80 backdrop-blur border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Show boards panel"
          >
            ☰ Boards
          </button>
        )}
        {excalidrawLoaded && ExcalidrawComponent ? (
        <ExcalidrawComponent
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          excalidrawAPI={(api: any) => { apiRef.current = api; }}
          initialData={initialData}
          onChange={handleChange}
          theme={systemTheme}
          name={isLocalMode ? "Local canvas" : (updateBoard.variables?.title ?? board?.title ?? "Untitled")}
        >
          {MainMenu && (
            <MainMenu>
              {/* Save actions */}
              {!isLocalMode && (
                <MainMenu.Item onSelect={handleSaveNow}>
                  Save now
                </MainMenu.Item>
              )}
              {isLocalMode && session && (
                <MainMenu.Item onSelect={handleSaveToCloud}>
                  Save to cloud
                </MainMenu.Item>
              )}
              {isLocalMode && !session && (
                <MainMenu.Item onSelect={() => navigate("/login")}>
                  Sign in to save
                </MainMenu.Item>
              )}
              <MainMenu.Item onSelect={handleExportPNG}>
                Export as PNG
              </MainMenu.Item>
              {!isLocalMode && (
                <MainMenu.Item onSelect={handleRename}>
                  Rename board
                </MainMenu.Item>
              )}
              <MainMenu.Item onSelect={() => navigate("/")}>
                Dashboard
              </MainMenu.Item>
              <MainMenu.Separator />

              {/* Excalidraw defaults */}
              <MainMenu.DefaultItems.ToggleTheme />
              <MainMenu.DefaultItems.ChangeCanvasBackground />
              <MainMenu.DefaultItems.Help />
              <MainMenu.Separator />

              {/* Status */}
              <MainMenu.Item onSelect={() => {}}>
                <span className={dirty ? "text-amber-400" : "text-emerald-400"}>
                  {statusText}
                </span>
              </MainMenu.Item>
            </MainMenu>
          )}
        </ExcalidrawComponent>
      ) : (
        <FullPageSpinner />
      )}
      </div>
    </div>
  );
}
