import { useState } from "react";
import { useNavigate } from "react-router";
import { useTRPC } from "@/lib/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function BoardThumbnail({ boardId }: { boardId: string }) {
  const trpc = useTRPC();
  const { data: thumbnailUrl } = useQuery(
    trpc.boards.getThumbnail.queryOptions(
      { id: boardId },
      { staleTime: 1000 * 15, refetchOnWindowFocus: true },
    ),
  );

  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt="Board preview"
        className="h-full w-full rounded-lg object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-accent">
      <Logo size={32} className="opacity-20" />
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: boards, isLoading } = useQuery(
    trpc.boards.list.queryOptions(undefined, {
      staleTime: 1000 * 10,
      refetchOnWindowFocus: true,
    }),
  );
  const createBoard = useMutation(
    trpc.boards.create.mutationOptions({
      onSuccess: (board) => {
        if (board) navigate(`/board/${board.id}`);
      },
    }),
  );
  const updateBoard = useMutation(
    trpc.boards.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.boards.list.queryKey() });
      },
    }),
  );
  const deleteBoard = useMutation(
    trpc.boards.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.boards.list.queryKey() });
        setDeleteTarget(null);
      },
    }),
  );

  function cycleVisibility(boardId: string, current: string) {
    const order = ["private", "public", "shared"] as const;
    const next = order[(order.indexOf(current as typeof order[number]) + 1) % order.length];
    updateBoard.mutate({ id: boardId, visibility: next });
    toast.success(`Board set to ${next}`);
  }

  const filteredBoards = boards?.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-3">
          <Input
            type="text"
            placeholder="Search boards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          <Button
            size="sm"
            onClick={() => createBoard.mutate({ title: "Untitled" })}
            disabled={createBoard.isPending}
          >
            + New Board
          </Button>
        </div>
      </div>

      {/* Board Grid */}
      <div className="px-6 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : filteredBoards?.length === 0 ? (
          <div className="py-20 text-center">
            <Logo size={64} className="mx-auto opacity-20 mb-4" />
            <p className="text-lg text-muted-foreground">No boards yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first board to get started
            </p>
            <Button
              className="mt-6"
              size="sm"
              onClick={() => createBoard.mutate({ title: "Untitled" })}
              disabled={createBoard.isPending}
            >
              + New Board
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              All boards ({filteredBoards?.length})
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredBoards?.map((board) => (
                <Card
                  key={board.id}
                  onClick={() => navigate(`/board/${board.id}`)}
                  className="group cursor-pointer p-3 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="mb-2 aspect-video overflow-hidden rounded-md">
                    <BoardThumbnail boardId={board.id} />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-medium text-foreground flex-1">
                      {board.title}
                    </h3>
                    <Badge
                      variant={board.visibility === "private" ? "secondary" : "outline"}
                      className="text-[10px] shrink-0 cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        cycleVisibility(board.id, board.visibility);
                      }}
                      title="Click to change visibility"
                    >
                      {board.visibility}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(board.lastEditedAt).toLocaleDateString()}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(board.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete board</DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteBoard.isPending}
              onClick={() => {
                if (deleteTarget) deleteBoard.mutate({ id: deleteTarget });
              }}
            >
              {deleteBoard.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
