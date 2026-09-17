import { useEffect, useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, FieldLabel } from "@/components/bge/atoms";
import { logAudit } from "@/lib/queries";
import { generateDraft } from "@/lib/drafts.functions";
import {
  useAds,
  useAdsMutations,
  useDraftMutations,
  useDrafts,
  type AdsRow,
} from "@/lib/extras-queries";
import type { Client } from "@/lib/bge";

function useDebounced(value: string, onCommit: (value: string) => void) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => setLocal(value ?? ""), [value]);
  useEffect(() => {
    if ((value ?? "") === local) return;
    const timer = setTimeout(() => onCommit(local), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);
  return [local, setLocal] as const;
}

function DebouncedInput({
  value,
  onCommit,
  ...rest
}: { value: string; onCommit: (value: string) => void } & Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange"
>) {
  const [local, setLocal] = useDebounced(value, onCommit);
  return <Input {...rest} value={local} onChange={(e) => setLocal(e.target.value)} />;
}

function DebouncedTextarea({
  value,
  onCommit,
  ...rest
}: { value: string; onCommit: (value: string) => void } & Omit<
  React.ComponentProps<typeof Textarea>,
  "value" | "onChange"
>) {
  const [local, setLocal] = useDebounced(value, onCommit);
  return <Textarea {...rest} value={local} onChange={(e) => setLocal(e.target.value)} />;
}

const money = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value || 0);

const NUMBER_FIELDS = [
  ["spend", "Ad spend"],
  ["leads", "Leads"],
  ["calls_booked", "Calls booked"],
  ["sales", "Sales"],
  ["revenue", "Revenue"],
] as const;

function AdsWeek({ row }: { row: AdsRow }) {
  const { update, remove } = useAdsMutations();
  const set = (patch: Partial<AdsRow>) => update.mutate({ id: row.id, patch });

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <FieldLabel>Week starting</FieldLabel>
          <Input
            type="date"
            value={row.week_start ?? ""}
            onChange={(e) => set({ week_start: e.target.value })}
            className="bg-card"
          />
        </div>
        {NUMBER_FIELDS.map(([key, label]) => (
          <div key={key} className="w-28">
            <FieldLabel>{label}</FieldLabel>
            <DebouncedInput
              type="number"
              value={String(row[key] ?? 0)}
              onCommit={(v) => set({ [key]: Number(v) || 0 } as Partial<AdsRow>)}
              className="bg-card"
            />
          </div>
        ))}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => remove.mutate(row.id)}
          aria-label="Remove week"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span>Cost per lead: {row.leads ? money(Number(row.spend) / row.leads) : "—"}</span>
        <span>
          Cost per call: {row.calls_booked ? money(Number(row.spend) / row.calls_booked) : "—"}
        </span>
        <span>
          Return:{" "}
          {Number(row.spend) ? (Number(row.revenue) / Number(row.spend)).toFixed(2) + "x" : "—"}
        </span>
      </div>
      <div className="mt-2">
        <DebouncedInput
          value={row.note ?? ""}
          placeholder="What changed this week?"
          onCommit={(note) => set({ note })}
          className="bg-card"
        />
      </div>
    </div>
  );
}

export function AdsPanel({ client }: { client: Client }) {
  const { data: rows = [], isLoading } = useAds(client.id);
  const { add } = useAdsMutations();

  const totals = rows.reduce(
    (acc, row) => ({
      spend: acc.spend + Number(row.spend || 0),
      leads: acc.leads + (row.leads || 0),
      calls: acc.calls + (row.calls_booked || 0),
      sales: acc.sales + (row.sales || 0),
      revenue: acc.revenue + Number(row.revenue || 0),
    }),
    { spend: 0, leads: 0, calls: 0, sales: 0, revenue: 0 },
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-muted-foreground">
          Weekly ad numbers, entered by the team. Clients never see this.
        </p>
        <Button
          size="sm"
          onClick={() =>
            add.mutate({ client_id: client.id }, { onSuccess: () => toast.success("Week added") })
          }
        >
          <Plus className="mr-1 size-4" /> Add week
        </Button>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ["Spend", money(totals.spend)],
            ["Leads", String(totals.leads)],
            ["Calls", String(totals.calls)],
            ["Sales", String(totals.sales)],
            ["Revenue", money(totals.revenue)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-border px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-[12px] text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState>No ad weeks logged yet.</EmptyState>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <AdsWeek key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

const KINDS = [
  ["faq", "FAQ section"],
  ["thankyou", "Thank-you page"],
  ["emails", "Email follow-up sequence"],
] as const;

export function DraftsPanel({ client }: { client: Client }) {
  const { data: rows = [] } = useDrafts(client.id);
  const { add, update, remove } = useDraftMutations();
  const run = useServerFn(generateDraft);
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>("faq");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);

  const write = async () => {
    setBusy(true);
    try {
      const result = await run({
        data: {
          kind,
          clientName: client.name,
          niche: client.niche ?? "",
          program: client.program ?? "",
          brief,
        },
      });
      const label = KINDS.find(([k]) => k === kind)?.[1] ?? "Draft";
      add.mutate({
        client_id: client.id,
        kind,
        title: label,
        content: result.content,
      });
      void logAudit("draft_written", client.name, label);
      setBrief("");
      toast.success(`${label} draft ready`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The draft could not be written.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border p-3">
        <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
          <div>
            <FieldLabel>What to write</FieldLabel>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as (typeof KINDS)[number][0])}
              className="h-9 w-full rounded-md border border-input bg-card px-2 text-[13px]"
            >
              {KINDS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Anything it should know (optional)</FieldLabel>
            <Input
              value={brief}
              placeholder="Offer, price point, main objection…"
              onChange={(e) => setBrief(e.target.value)}
              className="bg-card"
            />
          </div>
        </div>
        <Button size="sm" className="mt-3" disabled={busy} onClick={() => void write()}>
          {busy ? (
            <Loader2 className="mr-1 size-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1 size-4" />
          )}
          {busy ? "Writing…" : "Write a first draft"}
        </Button>
        <p className="mt-2 text-[11px] text-muted-foreground">
          A first draft only — a team member edits it before anything goes to the client.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState>No drafts saved yet.</EmptyState>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <DebouncedInput
                  value={row.title}
                  onCommit={(title) => update.mutate({ id: row.id, patch: { title } })}
                  className="h-8 bg-card font-medium"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove.mutate(row.id)}
                  aria-label="Delete draft"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <DebouncedTextarea
                value={row.content}
                onCommit={(content) => update.mutate({ id: row.id, patch: { content } })}
                className="mt-2 min-h-40 bg-card font-mono text-[12px]"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
