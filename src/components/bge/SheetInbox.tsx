import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { RefreshCw, Link2, AlertTriangle, Plus, Pencil, Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState, SectionCard } from "@/components/bge/atoms";
import { ShowMore } from "@/components/bge/ShowMore";
import { useClients } from "@/lib/queries";
import { syncActiveClientSheet } from "@/lib/sheet-sync.functions";
import {
  usePendingSheetRows,
  useDecideSheetRow,
  useResolveMissingClient,
  useParkSheetRow,
  useParkMissingClient,
  useKeepDespiteSheet,
  waitingDays,
  type PendingRow,
} from "@/lib/sheet-sync";

const FIELD_LABELS: Record<string, string> = {
  renewal: "Renewal",
  active: "Value",
  leaving: "Leaving",
  program: "Program",
  payment: "Payment",
  sheet_notes: "Sheet notes",
  vsl_form: "VSL form",
  vsl_delivered: "VSL delivered",
  ads_delivered: "Ads delivered",
};

export function SheetSyncButton() {
  const run = useServerFn(syncActiveClientSheet);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const result = await run({ data: undefined });
          if (!result.ok) {
            toast.error(result.error ?? "The sheet sync failed");
            return;
          }
          void qc.invalidateQueries({ queryKey: ["sheet_pending"] });
          void qc.invalidateQueries({ queryKey: ["clients"] });
          const bits = [
            result.newRows ? `${result.newRows} new` : "",
            result.updates ? `${result.updates} changed` : "",
            result.links ? `${result.links} to link` : "",
            result.missing ? `${result.missing} no longer listed` : "",
          ].filter(Boolean);
          toast.success(
            `Read ${result.fetched} clients from the sheet${bits.length ? ` — ${bits.join(", ")} waiting for a decision` : " — nothing to decide"}`,
          );
        } catch {
          toast.error("Could not reach the sheet");
        } finally {
          setBusy(false);
        }
      }}
    >
      <RefreshCw className={busy ? "size-3.5 animate-spin" : "size-3.5"} />
      {busy ? "Syncing…" : "Sync sheet"}
    </Button>
  );
}

function Waiting({ since }: { since: string | null | undefined }) {
  const days = waitingDays(since);
  if (days < 1) return <span className="text-[11px] text-muted-foreground">today</span>;
  return (
    <span
      className={
        days >= 3
          ? "rounded bg-warning/20 px-1.5 py-0.5 text-[11px] font-semibold text-warning-foreground"
          : "text-[11px] text-muted-foreground"
      }
    >
      waiting {days} day{days === 1 ? "" : "s"}
    </span>
  );
}

function RowHead({
  row,
  icon: Icon,
  label,
}: {
  row: PendingRow;
  icon: typeof Plus;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Icon className="size-3.5 text-primary" />
      <span className="text-sm font-semibold">{row.name}</span>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase">
        {label}
      </span>
      {row.sheet_row && (
        <span className="num text-[11px] text-muted-foreground">sheet row {row.sheet_row}</span>
      )}
      <Waiting since={row.created_at} />
    </div>
  );
}

function SheetValues({ row }: { row: PendingRow }) {
  const text =
    ["program", "active", "payment", "renewal", "leaving"]
      .map((f) => row.fields?.[f])
      .filter(Boolean)
      .join(" · ") || "No extra details on the sheet";
  return <p className="mt-1 text-[12px] text-muted-foreground">{text}</p>;
}

type LinkableClient = { id: string; name: string; program?: string | null };

/**
 * Suggests the profile the sheet row probably belongs to, while still letting
 * the team pick any other client (or add a brand new one) in case of a mix-up.
 */
function LinkChoice({
  row,
  clients,
  decide,
}: {
  row: PendingRow;
  clients: LinkableClient[];
  decide: ReturnType<typeof useDecideSheetRow>;
}) {
  const suggested = row.kind === "link" ? row.client_id : null;
  const [choice, setChoice] = useState<string>(suggested ?? "new");
  const options = [...clients].sort((a, b) => a.name.localeCompare(b.name));
  const picked = options.find((c) => c.id === choice);

  return (
    <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-2.5">
      {suggested ? (
        <p className="text-[12px]">
          It could be{" "}
          <span className="font-semibold">
            {options.find((c) => c.id === suggested)?.name ?? row.name}
          </span>{" "}
          — check it is the right person, or pick someone else below.
        </p>
      ) : (
        <p className="text-[12px]">
          No obvious match. Add them as a new client, or link them to a profile we already have.
        </p>
      )}
      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px]"
      >
        <option value="new">Add "{row.name}" as a new client</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.program ? ` — ${c.program}` : ""}
            {c.id === suggested ? " (suggested)" : ""}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={decide.isPending}
        onClick={() =>
          decide.mutate(
            { row, approve: true, linkClientId: choice === "new" ? null : choice },
            {
              onSuccess: () =>
                toast.success(
                  choice === "new"
                    ? `${row.name} added to the board`
                    : `Sheet row linked to ${picked?.name ?? "that client"}`,
                ),
              onError: () => toast.error("Could not do that"),
            },
          )
        }
        className="bg-primary text-primary-foreground hover:bg-primary-dark"
      >
        {choice === "new"
          ? "Add straight to the board"
          : `Link them to ${picked?.name ?? "client"}`}
      </Button>
    </div>
  );
}

export function SheetInbox() {
  const { data: rows = [] } = usePendingSheetRows();
  const { data: clients = [] } = useClients();
  const decide = useDecideSheetRow();
  const resolve = useResolveMissingClient();
  const park = useParkSheetRow();
  const parkClient = useParkMissingClient();
  const keepDespite = useKeepDespiteSheet();

  const live = rows.filter((r) => r.status === "pending");
  const parked = rows.filter((r) => r.status === "parked");

  const newRows = live.filter((r) => r.kind === "new");
  const linkRows = live.filter((r) => r.kind === "link");
  const changed = live.filter((r) => r.kind === "update");

  const missingAll = clients.filter(
    (c) => (c as { missing_from_sheet?: boolean }).missing_from_sheet,
  );
  const unclear = missingAll.filter((c) =>
    ((c as { sheet_override_note?: string | null }).sheet_override_note ?? "").startsWith(
      "Unclear",
    ),
  );
  const missing = missingAll.filter((c) => !unclear.includes(c));

  // Signed in the portal at onboarding, but the sheet has not caught up yet.
  const notOnSheet = clients.filter((c) => {
    const row = c as { origin?: string | null; sheet_row?: number | null; ex_client?: boolean };
    return !row.ex_client && row.origin !== "sheet" && !row.sheet_row;
  });

  const waitingCount = live.length + missing.length;

  return (
    <div className="space-y-4">
      <SectionCard
        title={`Active Client Sheet check${waitingCount ? ` — ${waitingCount} waiting` : ""}`}
        action={<SheetSyncButton />}
      >
        {waitingCount === 0 && parked.length === 0 && unclear.length === 0 ? (
          <EmptyState>
            Nothing waiting. Names that appear, change or disappear on the sheet land here for a
            decision before anything on the board moves.
          </EmptyState>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            Everything the sheet disagrees with lands here. Nothing changes on the board until you
            choose.
          </p>
        )}
      </SectionCard>

      {notOnSheet.length > 0 && (
        <SectionCard title={`Signed here, not on the sheet yet (${notOnSheet.length})`}>
          <ShowMore
            items={notOnSheet}
            limit={3}
            noun="more"
            render={(client) => (
              <li
                key={client.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3"
              >
                <span className="text-sm font-semibold">{client.name}</span>
                <span className="min-w-0 flex-1 text-[12px] text-muted-foreground">
                  Created here at onboarding. When their name appears on the sheet, the sync offers
                  it as a link — one click ties them together.
                </span>
              </li>
            )}
          />
        </SectionCard>
      )}

      {(newRows.length > 0 || linkRows.length > 0) && (
        <SectionCard
          title={`Active Client Sheet — added rows (${newRows.length + linkRows.length})`}
        >
          <ShowMore
            items={[...linkRows, ...newRows]}
            limit={3}
            noun="more"
            render={(row) => {
              const caseId = row.fields?.["onboarding_case_id"] as string | null | undefined;
              return (
                <li key={row.id} className="space-y-2 rounded-lg border border-border p-3">
                  <RowHead
                    row={row}
                    icon={row.kind === "link" ? Link2 : Plus}
                    label={row.kind === "link" ? "Link to a profile we have" : "New name"}
                  />
                  <SheetValues row={row} />
                  {row.kind === "new" && caseId && (
                    <p className="text-[11px] text-muted-foreground">
                      They are already part-way through onboarding. Adding them creates their
                      profile and ties it to their onboarding card.
                    </p>
                  )}
                  <LinkChoice row={row} clients={clients} decide={decide} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" onClick={() => park.mutate({ row })}>
                      Unclear right now
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ row, approve: false })}
                    >
                      Not a client
                    </Button>
                  </div>
                </li>
              );
            }}
          />
        </SectionCard>
      )}

      {missing.length > 0 && (
        <SectionCard title={`Active Client Sheet — rows taken away (${missing.length})`}>
          <p className="mb-2 text-[12px] text-muted-foreground">
            These people may have left us. Double-check, then keep them as a client or move them to
            the ex-clients tab.
          </p>
          <ShowMore
            items={missing}
            limit={3}
            noun="more"
            render={(client) => (
              <li
                key={client.id}
                className="space-y-2 rounded-lg border border-warning/50 bg-warning/5 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <AlertTriangle className="size-3.5 text-warning" />
                  <span className="text-sm font-semibold">{client.name}</span>
                  <span className="min-w-0 flex-1 text-[12px] text-muted-foreground">
                    Their row is gone from the Active Client Sheet.
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={keepDespite.isPending}
                    onClick={() =>
                      keepDespite.mutate(
                        { client },
                        {
                          onSuccess: () =>
                            toast.success(`Noted — add ${client.name} back on the sheet`),
                        },
                      )
                    }
                  >
                    Keep them — fix the Active Client Sheet
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      resolve.mutate(
                        { client, keep: false },
                        { onSuccess: () => toast.success(`${client.name} moved to ex-clients`) },
                      )
                    }
                    className="bg-primary text-primary-foreground hover:bg-primary-dark"
                  >
                    Remove client (send to ex-clients)
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => parkClient.mutate({ client })}>
                    Unclear right now
                  </Button>
                </div>
              </li>
            )}
          />
        </SectionCard>
      )}

      {changed.length > 0 && (
        <SectionCard title={`Changed on the sheet (${changed.length})`}>
          <ShowMore
            items={changed}
            limit={3}
            noun="more"
            render={(row) => (
              <li key={row.id} className="space-y-2 rounded-lg border border-border p-3">
                <RowHead row={row} icon={Pencil} label="Changed" />
                <div className="space-y-1">
                  {Object.entries(row.changes ?? {}).map(([field, value]) => (
                    <p key={field} className="text-[12px]">
                      <span className="text-muted-foreground">
                        {FIELD_LABELS[field] ?? field}:{" "}
                      </span>
                      <span className="line-through opacity-60">{value.old ?? "—"}</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium">{value.new ?? "—"}</span>
                    </p>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ row, approve: true })}
                    className="bg-primary text-primary-foreground hover:bg-primary-dark"
                  >
                    Apply
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => park.mutate({ row })}>
                    Unclear right now
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ row, approve: false })}
                  >
                    Ignore
                  </Button>
                </div>
              </li>
            )}
          />
        </SectionCard>
      )}

      {(parked.length > 0 || unclear.length > 0) && (
        <SectionCard title={`Waiting on an answer (${parked.length + unclear.length})`}>
          <ul className="space-y-2">
            {parked.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3"
              >
                <Clock className="size-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold">{row.name}</span>
                <span className="min-w-0 flex-1 text-[12px] text-muted-foreground">
                  Parked as unclear. Comes back on {row.parked_until ?? "the next sync"}.
                </span>
                <Waiting since={row.created_at} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => decide.mutate({ row, approve: true })}
                >
                  Decide now
                </Button>
              </li>
            ))}
            {unclear.map((client) => (
              <li
                key={client.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3"
              >
                <Clock className="size-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold">{client.name}</span>
                <span className="min-w-0 flex-1 text-[12px] text-muted-foreground">
                  Off the sheet and marked unclear — someone needs to confirm whether they stay.
                </span>
                <Button size="sm" variant="outline" onClick={() => keepDespite.mutate({ client })}>
                  Still a client
                </Button>
                <Button
                  size="sm"
                  onClick={() => resolve.mutate({ client, keep: false })}
                  className="bg-primary text-primary-foreground hover:bg-primary-dark"
                >
                  Send to ex-clients
                </Button>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

/** Dashboard line: how much the sheet check is waiting on, and where to go. */
export function SheetCheckSummary() {
  const { data: rows = [] } = usePendingSheetRows();
  const { data: clients = [] } = useClients();
  const missing = clients.filter(
    (c) => (c as { missing_from_sheet?: boolean }).missing_from_sheet,
  ).length;
  const waiting = rows.filter((r) => r.status === "pending").length + missing;

  return (
    <SectionCard title="Active Client Sheet check" action={<SheetSyncButton />}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">
          {waiting
            ? `${waiting} sheet item${waiting === 1 ? "" : "s"} waiting on a decision`
            : "The sheet and the board agree — nothing waiting."}
        </span>
        <span className="flex-1" />
        <Button asChild size="sm" variant="outline">
          <Link to="/onboarding">Open Onboarding</Link>
        </Button>
      </div>
    </SectionCard>
  );
}
