import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ToastProvider } from "@/components/toast";

const title = "Tabby — split bills with friends, settle with UPI";
const description = "Split bills with friends. No signup, no ads, no daily limits. Settle up with UPI in one tap.";

// Everything is rendered per request (data lives in D1), so no incremental cache is needed.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:8787";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  let metadataBase: URL;
  try {
    metadataBase = new URL(`${proto}://${host}`);
  } catch {
    metadataBase = new URL("http://localhost:8787");
  }
  return { metadataBase, ...baseMetadata };
}

const baseMetadata: Metadata = {
  title: { default: title, template: "%s · Tabby" },
  description,
  applicationName: "Tabby",
  appleWebApp: { capable: true, title: "Tabby", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: { type: "website", siteName: "Tabby", title, description, images: [{ url: "/og.png", width: 1200, height: 630, alt: "Tabby" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#100e0c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg font-sans text-ink antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
