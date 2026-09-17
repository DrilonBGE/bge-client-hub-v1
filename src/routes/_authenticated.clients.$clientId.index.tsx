import { createFileRoute, Link } from "@tanstack/react-router";

import { ClientWorkspace } from "@/components/bge/ClientWorkspace";
import { useBoard } from "@/components/bge/client-modal-context";
import { useClients, usePhases } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/clients/$clientId/")({
  validateSearch: (search: Record<string, unknown>): { tab?: string; task?: string } => {
    const out: { tab?: string; task?: string } = {};
    if (typeof search["tab"] === "string") out.tab = search["tab"];
    if (typeof search["task"] === "string") out.task = search["task"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Client Journey — Build, Grow & Exit" },
      { name: "description", content: "Full client journey roadmap, actions and delivery record." },
      { property: "og:title", content: "Client Journey — Build, Grow & Exit" },
      {
        property: "og:description",
        content: "Full client journey roadmap, actions and delivery record.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientPage,
});

function ClientPage() {
  const { clientId } = Route.useParams();
  const { tab, task } = Route.useSearch();
  const { sync } = useBoard();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: phases, isLoading: phasesLoading } = usePhases();
  const client = clients?.find((item) => item.id === clientId);

  if (clientsLoading || phasesLoading) {
    return <div className="min-h-screen animate-pulse bg-background" />;
  }

  if (!client || !phases) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
        <div>
          <p className="eyebrow">Client workspace</p>
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
  }

  return (
    <ClientWorkspace client={client} phases={phases} sync={sync} openTab={tab} focusTask={task} />
  );
}
