import { createTRPCContext } from "@trpc/tanstack-react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@howlboard/api/routers/index";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/trpc",
      fetch(url: string | URL | Request, options?: RequestInit) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ],
});
