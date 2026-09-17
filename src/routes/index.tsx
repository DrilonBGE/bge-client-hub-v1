import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BGE Client Portal" },
      { name: "description", content: "Secure Build, Grow & Exit client and team portal." },
      { property: "og:title", content: "BGE Client Portal" },
      { property: "og:description", content: "Secure Build, Grow & Exit client and team portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
