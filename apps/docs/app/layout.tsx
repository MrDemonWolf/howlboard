import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { Provider } from "@/components/provider";
import "./global.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | HowlBoard Docs",
    default: "HowlBoard Docs",
  },
  description:
    "Documentation for HowlBoard — self-hosted collaborative whiteboard",
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
