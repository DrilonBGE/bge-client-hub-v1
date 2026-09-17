import { useMemo } from "react";

import { EmptyState, SectionCard } from "@/components/bge/atoms";
import { ShowMore } from "@/components/bge/ShowMore";
import { HEALTH, healthMeta } from "@/lib/journey";
import { useUpdateClient } from "@/lib/queries";
import type { Client } from "@/lib/bge";

const ORDER: Record<string, number> = { red: 0, amber: 1, green: 2 };

/** High priority clients first, so nobody at risk slips through the week. */
export function HealthBoard({
  clients,
  onOpenClient,
}: {
  clients: Client[];
  onOpenClient?: (id: string) => void;
}) {
  const update = useUpdateClient();

  const rows = useMemo(
    () =>
      [...clients].sort(
        (a, b) =>
          (ORDER[a.health ?? "green"] ?? 2) - (ORDER[b.health ?? "green"] ?? 2) ||
          a.name.localeCompare(b.name),
      ),
    [clients],
  );

  const atRisk = rows.filter((c) => c.health === "red").length;

  return (
    <SectionCard
      title="Client health"
      action={
        <span className="text-[11px] font-semibold text-destructive">{atRisk} high priority</span>
      }
    >
      {rows.length === 0 ? (
        <EmptyState>No clients on the board yet.</EmptyState>
      ) : (
        <ShowMore
          items={rows}
          limit={5}
          noun="more clients"
          className="space-y-1.5"
          render={(client) => {
            const meta = healthMeta(client.health);
            return (
              <div
                key={client.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
                style={
                  client.health === "red"
                    ? { borderColor: "var(--destructive)", backgroundColor: "var(--card)" }
                    : undefined
                }
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: meta.colour, boxShadow: `0 0 8px ${meta.colour}` }}
                />
                <button
                  onClick={() => onOpenClient?.(client.id)}
                  className="text-[13px] font-medium hover:text-primary"
                >
                  {client.name}
                </button>
                <span className="text-[11px]" style={{ color: meta.colour }}>
                  {meta.label}
                </span>
                {client.feel_note && (
                  <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                    {client.feel_note}
                  </span>
                )}
                <select
                  value={client.health ?? "green"}
                  onChange={(e) =>
                    update.mutate({ id: client.id, patch: { health: e.target.value } })
                  }
                  className="ml-auto h-7 rounded-md border border-input bg-card px-1.5 text-[11px]"
                  aria-label={`Health for ${client.name}`}
                >
                  {HEALTH.map((h) => (
                    <option key={h.key} value={h.key}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }}
        />
      )}
    </SectionCard>
  );
}
