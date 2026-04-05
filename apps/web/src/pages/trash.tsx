import { useTRPC } from "@/lib/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Logo } from "@/components/logo";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";

export function Trash() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: boards, isLoading } = useQuery(
    trpc.boards.listTrashed.queryOptions(),
  );

  const restore = useMutation(
    trpc.boards.restore.mutationOptions({
      onSuccess: () => {
        toast.success("Board restored");
        void queryClient.invalidateQueries();
      },
    }),
  );

  const permanentlyDelete = useMutation(
    trpc.boards.permanentlyDelete.mutationOptions({
      onSuccess: () => {
        toast.success("Board permanently deleted");
        setDeleteTarget(null);
        void queryClient.invalidateQueries();
      },
    }),
  );

  return (
    <DashboardLayout>
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Trash</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Deleted boards can be restored or permanently removed.
        </p>
      </div>

      <div className="px-6 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : !boards?.length ? (
          <div className="py-20 text-center">
            <Logo size={48} className="mx-auto opacity-20 mb-4" />
            <p className="text-muted-foreground">Trash is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-w-2xl">
            {boards.map((board) => (
              <Card key={board.id} className="flex items-center justify-between p-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground">{board.title}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Deleted {new Date(board.deletedAt!).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => restore.mutate({ id: board.id })}
                    disabled={restore.isPending}
                  >
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(board.id)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete</DialogTitle>
            <DialogDescription>
              This will permanently delete the board and all its data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={permanentlyDelete.isPending}
              onClick={() => { if (deleteTarget) permanentlyDelete.mutate({ id: deleteTarget }); }}
            >
              {permanentlyDelete.isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
