import { router } from "../index";
import { boardsRouter } from "./boards";
import { collectionsRouter } from "./collections";
import { settingsRouter } from "./settings";

export const appRouter = router({
  boards: boardsRouter,
  collections: collectionsRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
