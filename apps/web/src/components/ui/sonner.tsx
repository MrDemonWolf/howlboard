import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/lib/theme";

export function Toaster() {
  const { resolved } = useTheme();

  return (
    <SonnerToaster
      position="bottom-right"
      theme={resolved}
      richColors
      closeButton
      duration={3000}
      toastOptions={{
        style: {
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          color: "var(--color-foreground)",
        },
      }}
    />
  );
}
