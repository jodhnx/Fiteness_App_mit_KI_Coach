import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEXFORM",
    short_name: "NEXFORM",
    description: "Training, Ernährung und KI Coach — modern & personalisiert.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "fullscreen"],
    orientation: "portrait",
    theme_color: "#09090b",
    background_color: "#09090b",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      {
        src: "/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
