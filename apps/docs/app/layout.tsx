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
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    title: "HowlBoard Docs",
    description:
      "Documentation for HowlBoard — self-hosted collaborative whiteboard",
    images: [{ url: "/og-banner.svg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HowlBoard Docs",
    description:
      "Documentation for HowlBoard — self-hosted collaborative whiteboard",
    images: ["/og-banner.svg"],
  },
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
