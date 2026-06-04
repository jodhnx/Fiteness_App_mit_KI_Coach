import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Fitness Coach Pro",
    short_name: "AI Coach",
    description: "Fitness, Ernährung und KI Coach für dein Training.",
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
