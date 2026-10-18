import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tabby — split bills with friends",
    short_name: "Tabby",
    description: "Split bills with friends. No signup, no ads, no daily limits. Settle up with UPI in one tap.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#f2622e",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
