import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/bge/AppShell";
import { useBoard } from "@/components/bge/client-modal-context";
import { useMyName } from "@/lib/journey-queries";
import { TaskBoard } from "@/components/bge/TaskBoard";
import { StandardTaskBoard } from "@/components/bge/StandardTaskBoard";
import { SheetCheckSummary } from "@/components/bge/SheetInbox";
import { NoticeBar } from "@/components/bge/NoticeBar";
import { VerifySignups } from "@/components/bge/VerifySignups";
import { HealthBoard } from "@/components/bge/HealthBoard";
import { TeamWorkload } from "@/components/bge/TeamWorkload";
import { PhaseMoves } from "@/components/bge/PhaseMoves";
import { WatchList } from "@/components/bge/WatchList";
import { ForYouPanel } from "@/components/bge/ForYouPanel";
import { EmptyState, SectionCard } from "@/components/bge/atoms";
import { useClients, usePhases } from "@/lib/queries";
import { useMyPrefs, widgetOn, widgetOrder } from "@/lib/prefs";
import { daysUntilLeaving, phaseColour, phaseProgress, type Client } from "@/lib/bge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — BGE Client Journey Board" },
      {
        name: "description",
        content: "Your outstanding tasks and where every client sits in their journey right now.",
      },
      { property: "og:title", content: "Dashboard — BGE Client Journey Board" },
      {
        property: "og:description",
        content: "Your outstanding tasks and live client progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { sync, openClient } = useBoard();
  const { data: clients } = useClients();
  const { data: phases } = usePhases();
  const { data: myName } = useMyName();
  const { data: prefs } = useMyPrefs();

  const active = useMemo(() => (clients ?? []).filter((c) => !c.ex_client), [clients]);
  const me = myName || "the team";

  const byPhase = useMemo(
    () =>
      (phases ?? []).map((phase) => ({
        phase,
        clients: active
          .filter((c) => c.phase === phase.phase_id)
          .map((c) => ({ client: c, progress: phaseProgress(c, phase) }))
          .sort((a, b) => b.progress.pct - a.progress.pct),
      })),
    [phases, active],
  );

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  return (
    <AppShell
      title="Dashboard"
      subtitle={`Your day, ${me}`}
      sync={sync}
      actions={
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-primary"
        >
          <Settings2 className="size-3.5" /> My dashboard
        </Link>
      }
    >
      <div className="space-y-4">
        <VerifySignups />
        {widgetOrder(prefs).map((key) => {
          if (!widgetOn(prefs, key)) return null;
          const panel = (() => {
            switch (key) {
              case "notice_bar":
                return <NoticeBar />;
              case "custom_tasks":
                return (
                  <TaskBoard
                    clients={active}
                    me={me}
                    onOpenClient={openClient}
                    title="Custom tasks (set by us or the client)"
                  />
                );
              case "standard_tasks":
                return (
                  <StandardTaskBoard
                    clients={active}
                    phases={phases ?? []}
                    me={me}
                    onOpenClient={openClient}
                  />
                );
              case "sheet_inbox":
                return <SheetCheckSummary />;
              case "phase_overview":
                return (
                  <SectionCard title="Where everyone is right now">
                    {byPhase.length === 0 ? (
                      <EmptyState>No clients on the board yet.</EmptyState>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {byPhase.map(({ phase, clients: rows }) => {
                          const isOpen = expanded[phase.phase_id] ?? false;
                          const previewLimit = 3;
                          const hasMore = rows.length > previewLimit;
                          const previewRows = isOpen ? rows : rows.slice(0, previewLimit);
                          return (
                            <div
                              key={phase.phase_id}
                              className="rounded-lg border border-border p-3"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="size-2.5 rounded-full"
                                  style={{
                                    backgroundColor: phaseColour(phase.phase_id),
                                    boxShadow: `0 0 10px ${phaseColour(phase.phase_id)}`,
                                  }}
                                />
                                <p className="text-[12px] font-semibold">{phase.name}</p>
                                <span className="num ml-auto text-[12px] text-muted-foreground">
                                  {rows.length}
                                </span>
                              </div>
                              <div className="mt-2 space-y-1">
                                {rows.length === 0 && (
                                  <p className="py-2 text-[12px] text-muted-foreground">
                                    Nobody here.
                                  </p>
                                )}
                                {previewRows.map(({ client, progress }) => (
                                  <button
                                    key={client.id}
                                    onClick={() => openClient(client.id)}
                                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[12px] hover:bg-accent"
                                  >
                                    <span className="min-w-0 flex-1 truncate font-medium">
                                      {client.name}
                                    </span>
                                    <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                                      <span
                                        className="block h-full rounded-full"
                                        style={{
                                          width: `${progress.pct}%`,
                                          background: "var(--gradient-ember)",
                                          boxShadow: "0 0 8px var(--glow)",
                                        }}
                                      />
                                    </span>
                                    <span className="num w-8 text-right text-muted-foreground">
                                      {progress.pct}%
                                    </span>
                                  </button>
                                ))}
                                {hasMore && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpanded((prev) => ({
                                        ...prev,
                                        [phase.phase_id]: !isOpen,
                                      }))
                                    }
                                    className={cn(
                                      "mt-1 flex w-full items-center justify-center gap-1 rounded-md py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                                      isOpen && "text-primary",
                                    )}
                                  >
                                    {isOpen ? (
                                      <>
                                        <ChevronUp className="size-3.5" /> Show less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="size-3.5" /> +
                                        {rows.length - previewLimit} more
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </SectionCard>
                );
              case "client_health":
                return <HealthBoard clients={active} onOpenClient={openClient} />;
              case "renewals":
                return <RenewalsSoon clients={active} onOpenClient={openClient} />;
              case "upsells":
                return <UpsellsOpen clients={active} onOpenClient={openClient} />;
              case "team_workload":
                return <TeamWorkload clients={active} />;
              case "phase_moves":
                return <PhaseMoves phases={phases ?? []} onOpenClient={openClient} />;
              case "watch_list":
                return <WatchList clients={active} me={me} />;
              case "for_you":
                return <ForYouPanel />;
              default:
                return null;
            }
          })();
          return panel ? <div key={key}>{panel}</div> : null;
        })}
      </div>
    </AppShell>
  );
}

/** Anyone whose programme ends soon, nearest first. */
function RenewalsSoon({
  clients,
  onOpenClient,
}: {
  clients: Client[];
  onOpenClient: (id: string) => void;
}) {
  const rows = clients
    .map((client) => ({ client, days: daysUntilLeaving(client) }))
    .filter((row) => row.days !== null && row.days >= 0 && row.days <= 60)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

  return (
    <SectionCard title="Renewals coming up">
      {rows.length === 0 ? (
        <EmptyState>Nobody is up for renewal in the next 60 days.</EmptyState>
      ) : (
        <div className="space-y-1.5">
          {rows.map(({ client, days }) => (
            <button
              key={client.id}
              onClick={() => onOpenClient(client.id)}
              className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-[13px] hover:bg-accent"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{client.name}</span>
              <span className="num text-[12px] text-muted-foreground">{client.leaving ?? "—"}</span>
              <span
                className={cn(
                  "num rounded px-1.5 py-0.5 text-[11px] font-semibold",
                  (days ?? 99) <= 30
                    ? "bg-warning/15 text-warning"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {days} days
              </span>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/** Clients who have not taken Amalor or SpeakScript Scale yet. */
function UpsellsOpen({
  clients,
  onOpenClient,
}: {
  clients: Client[];
  onOpenClient: (id: string) => void;
}) {
  const rows = clients.filter((client) => client.amalor !== "Yes" || client.sss !== "Yes");

  return (
    <SectionCard title="Upsells still on the table">
      {rows.length === 0 ? (
        <EmptyState>Everyone is on everything. Nice.</EmptyState>
      ) : (
        <div className="space-y-1.5">
          {rows.map((client) => (
            <button
              key={client.id}
              onClick={() => onOpenClient(client.id)}
              className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-[13px] hover:bg-accent"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{client.name}</span>
              {client.amalor !== "Yes" && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                  Amalor
                </span>
              )}
              {client.sss !== "Yes" && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                  SpeakScript Scale
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
