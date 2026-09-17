import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/bge/AppShell";
import { useBoard } from "@/components/bge/client-modal-context";
import { TaskBoard } from "@/components/bge/TaskBoard";
import { StandardTaskBoard } from "@/components/bge/StandardTaskBoard";
import { TeamWorkload } from "@/components/bge/TeamWorkload";
import { useMyName } from "@/lib/journey-queries";
import { useClients, usePhases } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/todos")({
  head: () => ({
    meta: [
      { title: "To-Do List — BGE Journey Board" },
      {
        name: "description",
        content: "Your outstanding tasks. Switch between yours, a teammate's or the whole team.",
      },
      { property: "og:title", content: "To-Do List — BGE Journey Board" },
      {
        property: "og:description",
        content: "Outstanding tasks filtered by owner, priority and deadline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TodosPage,
});

function TodosPage() {
  const { sync, openClient } = useBoard();
  const { data: clients } = useClients();
  const { data: phases } = usePhases();
  const { data: myName } = useMyName();
  const me = myName || "the team";
  const [tab, setTab] = useState<"assigned" | "standard">("assigned");
  const [who, setWho] = useState<string | null>(null);

  const active = (clients ?? []).filter((c) => !c.ex_client);

  return (
    <AppShell title="To-Do List" subtitle={`Everything waiting on ${me}`} sync={sync}>
      <div className="space-y-4">
        <div className="flex w-fit rounded-md border border-border p-0.5">
          {(
            [
              ["assigned", "Assigned tasks"],
              ["standard", "Standard phase tasks"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "rounded px-3 py-1 text-[12px] font-semibold transition-colors",
                tab === key ? "ember-fill" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <TeamWorkload clients={active} selected={who} onSelect={setWho} />

        {tab === "assigned" ? (
          <TaskBoard clients={active} me={me} onOpenClient={openClient} title="Assigned tasks" />
        ) : (
          <StandardTaskBoard
            clients={active}
            phases={phases ?? []}
            me={me}
            onOpenClient={openClient}
            focusPerson={who}
          />
        )}
      </div>
    </AppShell>
  );
}
