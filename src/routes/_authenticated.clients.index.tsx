import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Search, Trash2 } from "lucide-react";

import { toast } from "sonner";

import { ShowMore } from "@/components/bge/ShowMore";
import { HealthBoard } from "@/components/bge/HealthBoard";
import { AppShell } from "@/components/bge/AppShell";
import { useBoard } from "@/components/bge/client-modal-context";
import { ProgramBadge, ProgressBar } from "@/components/bge/atoms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { logAudit, useAddClient, useClients, usePhases, useUpdateClient } from "@/lib/queries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PHASE_COLOURS,
  PROGRAMS,
  PROGRAM_TIERS,
  PROGRAM_LABELS,
  daysUntilLeaving,
  overallProgress,
  type Client,
} from "@/lib/bge";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({
    meta: [
      { title: "Current Clients — BGE Journey Board" },
      {
        name: "description",
        content: "Six-phase kanban board of every active Build, Grow & Exit client.",
      },
      { property: "og:title", content: "Current Clients — BGE Journey Board" },
      { property: "og:description", content: "Six-phase kanban board of every active BGE client." },
    ],
  }),
  component: ClientsPage,
});

const HEALTH_TEXT: Record<string, string> = {
  green: "On track",
  amber: "Needs attention",
  red: "At risk",
};

const HEALTH_STYLE: Record<string, string> = {
  green: "bg-success/15 text-success",
  amber: "bg-warning/15 text-warning",
  red: "bg-destructive/15 text-destructive",
};

function ClientCard({ client, pct }: { client: Client; pct: number }) {
  const days = daysUntilLeaving(client);
  const warn = days !== null && days <= 45;
  const update = useUpdateClient();
  const [confirming, setConfirming] = useState(false);
  const sheet = client as Client & {
    origin?: string;
    missing_from_sheet?: boolean;
    leaving_date_suspect?: boolean;
  };

  return (
    <div className="relative">
      <button
        type="button"
        title="Move to ex clients"
        aria-label={`Move ${client.name} to ex clients`}
        onClick={() => setConfirming(true)}
        className="absolute right-1.5 top-1.5 z-10 rounded bg-card/90 p-1.5 text-muted-foreground opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 lg:opacity-0 lg:group-hover/card:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move {client.name} to ex clients?</AlertDialogTitle>
            <AlertDialogDescription>
              They come off the current board and sit in the ex clients archive, where you can bring
              them back or delete them for good.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                update.mutate({
                  id: client.id,
                  patch: {
                    ex_client: true,
                    ex_client_date: new Date().toISOString().slice(0, 10),
                  },
                });
                void logAudit("archive_client", client.name, "Moved to ex clients");
                toast.success(`${client.name} moved to ex clients`);
                setConfirming(false);
              }}
            >
              Move to ex clients
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <a
        href={`/clients/${client.id}`}
        target="_blank"
        rel="noreferrer"
        className="group/card group block w-full space-y-3 rounded-xl border border-border bg-card p-3 text-left shadow-card transition-[border-color,transform,box-shadow] hover:-translate-y-1 hover:border-primary/60 hover:shadow-ember focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{client.name}</p>
          <ProgramBadge program={client.program} />
        </div>
        {client.niche && (
          <p className="truncate text-[11px] text-muted-foreground">{client.niche}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
              HEALTH_STYLE[client.health ?? "green"],
            )}
          >
            {HEALTH_TEXT[client.health ?? "green"]}
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
            Phase {client.phase}
          </span>
        </div>
        <p className="num text-[12px] font-semibold">{client.active ?? "—"}</p>
        <ProgressBar pct={pct} phase={client.phase} />
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase text-muted-foreground">
          <span>{pct}% complete</span>
          <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Open workspace ↗
          </span>
        </div>
        {warn && (
          <p className="flex items-center gap-1 text-[11px] font-medium text-primary">
            <AlertTriangle className="size-3" /> Leaving {client.leaving}
          </p>
        )}
        {sheet.missing_from_sheet && (
          <p className="flex items-start gap-1 rounded border border-warning/50 bg-warning/10 px-1.5 py-1 text-[10px] font-medium text-warning">
            <AlertTriangle className="mt-px size-3 shrink-0" /> No longer on the Active Client Sheet
            — keep or move to ex-client?
          </p>
        )}
        {sheet.origin !== "sheet" && !sheet.missing_from_sheet && (
          <p className="text-[10px] text-muted-foreground">
            Added manually — not on the Active Client Sheet yet
          </p>
        )}
        {sheet.leaving_date_suspect && (
          <p className="text-[10px] text-warning">Check the leaving date on the sheet</p>
        )}
      </a>
    </div>
  );
}

const HEALTH_FILTERS = [
  ["all", "All health"],
  ["red", "At risk"],
  ["amber", "Needs attention"],
  ["green", "On track"],
] as const;

const LAUNCH_FILTERS = [
  ["all", "Launched or not"],
  ["yes", "Launched"],
  ["no", "Not launched yet"],
] as const;

const EXTRA_FILTERS = [
  ["all", "Everything else"],
  ["content_plan", "Content plan on"],
  ["renewal_soon", "Renewal within 30 days"],
  ["missing_sheet", "Not on the sheet"],
  ["pending", "Waiting on verification"],
] as const;

type Option = readonly [string, string];

/** One compact dropdown — the whole filter row is just a handful of these. */
function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 min-w-0 w-full rounded-md border border-input bg-background px-2 text-[12px] font-medium"
    >
      {options.map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  );
}

function ClientsPage() {
  const { sync, openClient } = useBoard();
  const { data: clients, isLoading } = useClients();
  const { data: phases } = usePhases();
  const addClient = useAddClient();

  const [query, setQuery] = useState("");
  const [program, setProgram] = useState<string>("All");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [health, setHealth] = useState<string>("all");
  const [launch, setLaunch] = useState<string>("all");
  const [extra, setExtra] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", program: "DFY", active: "", niche: "" });

  const active = useMemo(() => (clients ?? []).filter((c) => !c.ex_client), [clients]);

  const filtered = useMemo(
    () =>
      active.filter((client) => {
        const row = client as Client & {
          launched?: boolean | null;
          content_plan?: boolean | null;
          missing_from_sheet?: boolean | null;
          sheet_row?: number | null;
          portal_status?: string | null;
        };
        const needle = query.trim().toLowerCase();
        const matchesQuery =
          !needle ||
          client.name.toLowerCase().includes(needle) ||
          (client.niche ?? "").toLowerCase().includes(needle) ||
          (client.email ?? "").toLowerCase().includes(needle);
        // Combination tiers (e.g. DFY/DWY/DBY) show under each tier they contain.
        const matchesProgram = program === "All" || (client.program ?? "").includes(program);
        const matchesPhase = phaseFilter === "all" || client.phase === Number(phaseFilter);
        const matchesHealth = health === "all" || (client.health ?? "green") === health;
        const matchesLaunch =
          launch === "all" || (launch === "yes" ? Boolean(row.launched) : !row.launched);
        const days = daysUntilLeaving(client);
        const matchesExtra =
          extra === "all" ||
          (extra === "content_plan" && Boolean(row.content_plan)) ||
          (extra === "renewal_soon" && days !== null && days >= 0 && days <= 30) ||
          (extra === "missing_sheet" && (Boolean(row.missing_from_sheet) || !row.sheet_row)) ||
          (extra === "pending" && row.portal_status === "pending");
        return (
          matchesQuery &&
          matchesProgram &&
          matchesPhase &&
          matchesHealth &&
          matchesLaunch &&
          matchesExtra
        );
      }),
    [active, query, program, phaseFilter, health, launch, extra],
  );

  return (
    <AppShell
      title="Current Clients"
      subtitle={`${active.length} active clients · ${filtered.length} shown`}
      sync={sync}
      actions={
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="size-3.5" /> Add client
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 items-center gap-2 rounded-xl border border-border bg-card p-3 sm:flex sm:flex-wrap">
          <div className="relative col-span-2 min-w-0 flex-1 sm:min-w-56">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, niche or email"
              className="h-9 bg-background pl-8"
            />
          </div>
          <FilterSelect
            label="Package"
            options={["All", ...PROGRAM_TIERS].map((item): Option => [
              item,
              item === "All" ? "All packages" : (PROGRAM_LABELS[item] ?? item),
            ])}
            value={program}
            onChange={setProgram}
          />
          <FilterSelect
            label="Phase"
            options={[
              ["all", "All phases"] as Option,
              ...(phases ?? []).map((p): Option => [String(p.phase_id), `${p.label}: ${p.name}`]),
            ]}
            value={phaseFilter}
            onChange={setPhaseFilter}
          />
          <FilterSelect
            label="Health"
            options={HEALTH_FILTERS}
            value={health}
            onChange={setHealth}
          />
          <FilterSelect
            label="Launched"
            options={LAUNCH_FILTERS}
            value={launch}
            onChange={setLaunch}
          />
          <FilterSelect label="More" options={EXTRA_FILTERS} value={extra} onChange={setExtra} />
        </div>

        {adding && (
          <form
            className="grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!form.name.trim()) {
                toast.error("Client name is required");
                return;
              }
              addClient.mutate(form, {
                onSuccess: () => {
                  toast.success(`${form.name} added to Phase 1`);
                  setForm({ name: "", program: "DFY", active: "", niche: "" });
                  setAdding(false);
                },
                onError: () => toast.error("Could not add the client"),
              });
            }}
          >
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Client name"
              className="h-9"
            />
            <select
              value={form.program}
              onChange={(e) => setForm({ ...form, program: e.target.value })}
              className="h-9 rounded-md border border-input bg-card px-2 text-[13px]"
            >
              {PROGRAMS.map((p) => (
                <option key={p} value={p}>
                  {PROGRAM_LABELS[p] ?? p}
                </option>
              ))}
            </select>
            <Input
              value={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.value })}
              placeholder="Value e.g. £4,500"
              className="h-9"
            />
            <Input
              value={form.niche}
              onChange={(e) => setForm({ ...form, niche: e.target.value })}
              placeholder="Niche"
              className="h-9"
            />
            <Button
              type="submit"
              className="h-9 bg-primary text-primary-foreground hover:bg-primary-dark"
            >
              Add to board
            </Button>
          </form>
        )}

        {isLoading || !phases ? (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {phases.map((phase) => {
              const column = filtered.filter((c) => c.phase === phase.phase_id);
              return (
                <section key={phase.phase_id} className="min-w-0 space-y-2">
                  <header className="rounded-lg border border-border bg-card p-2.5 shadow-card">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: PHASE_COLOURS[phase.phase_id] }}
                      />
                      <p className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                        {phase.name}
                      </p>
                      <span className="num rounded bg-muted px-1.5 text-[11px] font-semibold">
                        {column.length}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {phase.label}
                    </p>
                  </header>
                  <div className="space-y-2">
                    <ShowMore
                      items={column}
                      limit={3}
                      noun="more clients"
                      render={(client) => (
                        <ClientCard
                          key={client.id}
                          client={client}
                          pct={overallProgress(client, phases).pct}
                        />
                      )}
                    />
                    {column.length === 0 && (
                      <p className="rounded-lg border border-dashed border-border py-6 text-center text-[11px] text-muted-foreground">
                        No clients
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <HealthBoard clients={filtered} onOpenClient={openClient} />
      </div>
    </AppShell>
  );
}
