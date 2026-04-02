import { useState } from "react";
import { useNavigate } from "react-router";
import { useTRPC } from "@/lib/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signOut } from "@/lib/auth-client";

export function Dashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: boards, isLoading } = useQuery(trpc.boards.list.queryOptions());
  const createBoard = useMutation(
    trpc.boards.create.mutationOptions({
      onSuccess: (board) => {
        if (board) navigate(`/board/${board.id}`);
      },
    }),
  );
  const deleteBoard = useMutation(
    trpc.boards.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.boards.list.queryKey() });
      },
    }),
  );

  const filteredBoards = boards?.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-howl-navy">
      {/* Header */}
      <header className="border-b border-howl-border bg-howl-surface px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-bold text-white">HowlBoard</h1>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search boards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-howl-border bg-howl-slate px-4 py-2 text-sm text-white placeholder-howl-muted outline-none focus:border-howl-cyan"
            />
            <button
              onClick={() => createBoard.mutate({ title: "Untitled" })}
              disabled={createBoard.isPending}
              className="rounded-lg bg-howl-cyan px-4 py-2 text-sm font-medium text-howl-navy transition-colors hover:bg-howl-cyan-light disabled:opacity-50"
            >
              + New Board
            </button>
            <button
              onClick={() => signOut()}
              className="rounded-lg border border-howl-border px-3 py-2 text-sm text-howl-muted transition-colors hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Board Grid */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-howl-cyan border-t-transparent" />
          </div>
        ) : filteredBoards?.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-howl-muted">No boards yet</p>
            <p className="mt-2 text-sm text-howl-muted">
              Create your first board to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredBoards?.map((board) => (
              <div
                key={board.id}
                onClick={() => navigate(`/board/${board.id}`)}
                className="group cursor-pointer rounded-xl border border-howl-border bg-howl-slate p-4 transition-all hover:border-howl-cyan/50 hover:shadow-lg hover:shadow-howl-cyan/5"
              >
                <div className="mb-3 aspect-video rounded-lg bg-howl-surface" />
                <h3 className="truncate font-medium text-white">
                  {board.title}
                </h3>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-howl-muted">
                    {new Date(board.lastEditedAt).toLocaleDateString()}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this board?")) {
                        deleteBoard.mutate({ id: board.id });
                      }
                    }}
                    className="text-xs text-howl-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
