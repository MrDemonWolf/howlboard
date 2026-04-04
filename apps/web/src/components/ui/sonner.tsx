import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        style: {
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          color: "var(--color-foreground)",
          fontSize: "13px",
        },
        classNames: {
          success: "!border-emerald-500/30",
          error: "!border-red-500/30",
          info: "!border-primary/30",
        },
      }}
    />
  );
}
