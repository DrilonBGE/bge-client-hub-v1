import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { useShowMore, ShowMoreButton } from "@/components/bge/ShowMore";
import { AppShell } from "@/components/bge/AppShell";
import { useBoard } from "@/components/bge/client-modal-context";
import { DaysChip, EmptyState, FieldLabel, SectionCard } from "@/components/bge/atoms";
import { RenewalNotes } from "@/components/bge/RenewalNotes";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useClients, useUpdateClient } from "@/lib/queries";
import { TEAM, daysUntilLeaving, type Client } from "@/lib/bge";

export const Route = createFileRoute("/_authenticated/renewals")({
  head: () => ({
    meta: [
      { title: "Renewals — BGE Client Journey Board" },
      {
        name: "description",
        content: "Clients leaving within 30 days, renewal notes and the new contract discussed.",
      },
      { property: "og:title", content: "Renewals — BGE Client Journey Board" },
      {
        property: "og:description",
        content: "Clients leaving within 30 days, renewal notes and new contract talks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RenewalsPage,
});

function RenewalCard({
  client,
  days,
  onOpen,
}: {
  client: Client;
  days: number;
  onOpen: () => void;
}) {
  const update = useUpdateClient();
  const save = (patch: Partial<Client>) => update.mutate({ id: client.id, patch });

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-3 py-2">
        <button onClick={onOpen} className="text-[14px] font-semibold hover:text-primary">
          {client.name}
        </button>
        <span className="num text-[12px] text-muted-foreground">{client.active ?? "—"}</span>
        <span className="text-[12px] text-muted-foreground">Leaving {client.leaving ?? "—"}</span>
        <DaysChip days={days} />
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={client.renewal_team_member ?? ""}
            onChange={(e) => save({ renewal_team_member: e.target.value })}
            className="h-8 rounded-md border border-input bg-card px-2 text-[12px]"
            aria-label="Renewal owner"
          >
            <option value="">Unassigned</option>
            {TEAM.map((member) => (
              <option key={member}>{member}</option>
            ))}
          </select>
          <select
            value={client.renewal_talked ?? ""}
            onChange={(e) => save({ renewal_talked: e.target.value })}
            className="h-8 rounded-md border border-input bg-card px-2 text-[12px]"
            aria-label="Renewal talked"
          >
            <option value="">Not yet</option>
            <option>Booked</option>
            <option>Talked</option>
            <option>Renewed</option>
            <option>Not renewing</option>
          </select>
        </span>
      </div>

      <RenewalNotes client={client} />
    </div>
  );
}

function RenewalsPage() {
  const { sync, openClient } = useBoard();
  const { data: clients } = useClients();

  const rows = useMemo(
    () =>
      (clients ?? [])
        .filter((c) => !c.ex_client)
        .map((client) => ({ client, days: daysUntilLeaving(client) }))
        .filter((row): row is { client: Client; days: number } => row.days !== null)
        .filter((row) => row.days >= 0 && row.days <= 30)
        .sort((a, b) => a.days - b.days),
    [clients],
  );

  const list = useShowMore(rows, 5);

  return (
    <AppShell title="Renewals" subtitle="Clients leaving in the next 30 days" sync={sync}>
      <SectionCard title={`${rows.length} renewals due`}>
        {rows.length === 0 ? (
          <EmptyState>No renewals due in the next 30 days.</EmptyState>
        ) : (
          <div className="space-y-3">
            {list.shown.map(({ client, days }) => (
              <RenewalCard
                key={client.id}
                client={client}
                days={days}
                onOpen={() => openClient(client.id)}
              />
            ))}
            <ShowMoreButton
              open={list.open}
              hidden={list.hidden}
              onClick={list.toggle}
              noun="more renewals"
            />
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}
