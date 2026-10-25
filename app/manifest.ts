import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Weight Loss & Health Tracker",
    short_name: "WeightLoss",
    description: "Daily weight, nutrition, water, steps, mood, and body measurement tracking with Gemini AI coaching and Google Search Grounding.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#090e17",
    theme_color: "#090e17",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "64x64 32x32 24x24 16x16",
        type: "image/x-icon",
        purpose: "any",
      },
    ],
  };
}
