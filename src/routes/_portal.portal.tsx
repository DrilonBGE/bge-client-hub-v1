import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMyClient } from "@/lib/journey-queries";
import { usePhases } from "@/lib/queries";
import { ClientPortalView } from "@/components/bge/ClientPortal";

export const Route = createFileRoute("/_portal/portal")({
  head: () => ({
    meta: [
      { title: "Your roadmap — Build, Grow & Exit" },
      {
        name: "description",
        content:
          "See exactly where your launch is, what we are working on, what we need from you and what lands next.",
      },
      { property: "og:title", content: "Your roadmap — Build, Grow & Exit" },
      {
        property: "og:description",
        content: "Your live launch roadmap: current stage, next step, owner and timings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalPage,
});

function PortalPage() {
  const { data: client, isLoading } = useMyClient();
  const { data: phases } = usePhases();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading your roadmap…</p>;
  if (!client)
    return (
      <div className="p-6">
        <p className="text-sm">
          We can&apos;t find your journey yet. Ask your BGE contact to switch your access on.
        </p>
        <Button className="mt-3" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>
    );

  return <ClientPortalView client={client} phases={phases} onSignOut={signOut} />;
}
