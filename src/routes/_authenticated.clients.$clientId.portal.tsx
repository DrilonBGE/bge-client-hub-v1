import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Eye } from "lucide-react";

import { ClientPortalView } from "@/components/bge/ClientPortal";
import { PortalOnboarding } from "@/components/bge/PortalOnboarding";
import { useClients, usePhases } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clients/$clientId/portal")({
  validateSearch: (search: Record<string, unknown>) => ({
    step:
      search["step"] === "first"
        ? ("first" as const)
        : search["step"] === "waiting"
          ? ("waiting" as const)
          : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Client Portal Preview — Build, Grow & Exit" },
      {
        name: "description",
        content: "See the whole portal exactly as this client sees it, page by page.",
      },
      { property: "og:title", content: "Client Portal Preview — Build, Grow & Exit" },
      {
        property: "og:description",
        content: "See the whole portal exactly as this client sees it, page by page.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalPreviewPage,
});

function PortalPreviewPage() {
  const { clientId } = Route.useParams();
  const { step } = Route.useSearch();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: phases, isLoading: phasesLoading } = usePhases();
  const client = clients?.find((item) => item.id === clientId);

  if (clientsLoading || phasesLoading)
    return <div className="min-h-screen animate-pulse bg-background" />;

  if (!client)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
        <div>
          <p className="eyebrow">Client portal</p>
          <h1 className="mt-2 text-xl font-semibold">This client could not be found.</h1>
          <Link
            to="/clients"
            className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
          >
            Back to current clients
          </Link>
        </div>
      </div>
    );

  const banner = (
    <div className="flex items-center gap-2 overflow-x-auto bg-primary px-3 py-2 text-primary-foreground sm:flex-wrap sm:gap-3 sm:px-4">
      <Eye className="size-4" />
      <span className="hidden shrink-0 text-[11px] font-bold uppercase tracking-widest sm:inline">
        Viewing {client.name}&apos;s portal as they see it
      </span>

      <div className="flex shrink-0 items-center gap-1 rounded-full bg-background/15 p-0.5">
        <Link
          to="/clients/$clientId/portal"
          params={{ clientId }}
          search={{ step: "first" }}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            step === "first" ? "bg-card text-primary" : "hover:bg-background/20",
          )}
        >
          Their first screen
        </Link>
        <Link
          to="/clients/$clientId/portal"
          params={{ clientId }}
          search={{ step: "waiting" }}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            step === "waiting" ? "bg-card text-primary" : "hover:bg-background/20",
          )}
        >
          While they wait for verification
        </Link>
        <Link
          to="/clients/$clientId/portal"
          params={{ clientId }}
          search={{ step: undefined }}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            step ? "hover:bg-background/20" : "bg-card text-primary",
          )}
        >
          After they agree
        </Link>
      </div>

      <Link
        to="/clients/$clientId"
        params={{ clientId }}
        search={{}}
        className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md bg-background/15 px-2.5 py-1 text-[11px] font-semibold hover:bg-background/25"
      >
        <ArrowLeft className="size-3.5" /> Back to team view
      </Link>
    </div>
  );

  if (step === "first")
    return (
      <div className="min-h-screen bg-background">
        {banner}
        <PortalOnboarding client={client} preview />
      </div>
    );

  // Lets the team see exactly what a brand new client sees before verification.
  const shown = step === "waiting" ? { ...client, portal_status: "pending" } : client;

  return <ClientPortalView client={shown} phases={phases} preview banner={banner} />;
}
