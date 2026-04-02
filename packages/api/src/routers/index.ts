import { router } from "../index";
import { boardsRouter } from "./boards";
import { collectionsRouter } from "./collections";

export const appRouter = router({
  boards: boardsRouter,
  collections: collectionsRouter,
});

export type AppRouter = typeof appRouter;
