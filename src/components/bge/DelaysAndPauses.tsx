import { useState } from "react";
import { PauseCircle, Plus, TimerReset, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DELAY_REASONS, formatDate } from "@/lib/journey";
import {
  useAddDelay,
  useDelays,
  useMyName,
  usePauseMutations,
  usePauses,
  useRemoveDelay,
} from "@/lib/journey-queries";
import { logAudit } from "@/lib/queries";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Every day the six week launch plan slipped, and every time the work was
 * paused. The team can log both sides; a client can only log their own.
 */
export function DelaysAndPauses({
  client,
  phase,
  clientView = false,
}: {
  client: { id: string; name: string };
  phase: number;
  clientView?: boolean;
}) {
  const { data: delays = [] } = useDelays(client.id);
  const { data: pauses = [] } = usePauses(client.id);
  const addDelay = useAddDelay();
  const removeDelay = useRemoveDelay();
  const pauseRows = usePauseMutations();
  const { data: myName = "" } = useMyName();

  const [form, setForm] = useState<"delay" | "pause" | null>(null);
  const [cause, setCause] = useState<"client" | "team">(clientView ? "client" : "client");
  const [days, setDays] = useState("1");
  const [reason, setReason] = useState<string>(DELAY_REASONS[0]);
  const [custom, setCustom] = useState("");
  const [when, setWhen] = useState(today());
  const [note, setNote] = useState("");
  const [pausedOn, setPausedOn] = useState(today());
  const [returningOn, setReturningOn] = useState("");

  const clientDays = delays
    .filter((row) => row.cause === "client")
    .reduce((sum, row) => sum + (row.days ?? 0), 0);
  const teamDays = delays
    .filter((row) => row.cause !== "client")
    .reduce((sum, row) => sum + (row.days ?? 0), 0);

  const reasonText = reason === "Other" ? custom.trim() : reason;

  const saveDelay = () => {
    const count = Number(days) || 0;
    if (!count || !reasonText) return;
    addDelay.mutate(
      {
        client_id: client.id,
        phase_id: phase,
        days: count,
        cause: clientView ? "client" : cause,
        reason: [reasonText, note.trim()].filter(Boolean).join(" — "),
        occurred_on: when || today(),
        client_visible: true,
        logged_by: clientView ? "Client" : myName || "Team",
      } as never,
      {
        onSuccess: () => {
          void logAudit("delay_logged", client.name, `+${count} days — ${reasonText}`);
          toast.success("Delay logged.");
          setForm(null);
          setNote("");
          setCustom("");
        },
      },
    );
  };

  const savePause = () => {
    pauseRows.add.mutate(
      {
        client_id: client.id,
        paused_on: pausedOn || today(),
        returning_on: returningOn || null,
        reason: note.trim() || null,
        by_client: clientView,
        logged_by: clientView ? "Client" : myName || "Team",
      } as never,
      {
        onSuccess: () => {
          void logAudit(
            "pause_logged",
            client.name,
            `Paused ${pausedOn} → ${returningOn || "TBC"}`,
          );
          toast.success("Pause logged.");
          setForm(null);
          setNote("");
        },
      },
    );
  };

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Delays and pauses</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            The goal is a launch inside six weeks. Anything that held it up is logged here.
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="border border-border"
            onClick={() => setForm(form === "delay" ? null : "delay")}
          >
            <Plus className="mr-1 size-3.5" /> Add delay
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="border border-border"
            onClick={() => setForm(form === "pause" ? null : "pause")}
          >
            <PauseCircle className="mr-1 size-3.5" /> Add pause
          </Button>
        </div>
      </div>

      {(clientDays > 0 || teamDays > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {clientDays > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-warning/50 bg-warning/10 px-2.5 py-1 text-[10px] font-bold uppercase text-warning">
              <TimerReset className="size-3" /> +{clientDays} days waiting on the client
            </span>
          )}
          {teamDays > 0 && !clientView && (
            <span className="flex items-center gap-1 rounded-full border border-destructive/50 bg-destructive/10 px-2.5 py-1 text-[10px] font-bold uppercase text-destructive">
              <TimerReset className="size-3" /> +{teamDays} days on us
            </span>
          )}
        </div>
      )}

      {form === "delay" && (
        <div className="mt-3 space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
          {!clientView && (
            <div className="flex gap-1.5">
              {(["client", "team"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCause(key)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                    cause === key
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {key === "client" ? "Client delay" : "Team delay"}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block text-[11px] text-muted-foreground">
              Days lost
              <Input
                type="number"
                min="1"
                value={days}
                onChange={(event) => setDays(event.target.value)}
                className="mt-1 h-9 bg-background text-sm"
              />
            </label>
            <label className="block text-[11px] text-muted-foreground">
              Date it happened
              <Input
                type="date"
                value={when}
                onChange={(event) => setWhen(event.target.value)}
                className="mt-1 h-9 bg-background text-sm"
              />
            </label>
            <label className="block text-[11px] text-muted-foreground">
              Reason
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {DELAY_REASONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {reason === "Other" && (
            <Input
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="Type the reason"
              className="h-9 bg-background text-sm"
            />
          )}
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="What happened, and how it held the work up"
            className="bg-background text-xs"
          />
          <Button size="sm" onClick={saveDelay} disabled={!reasonText || addDelay.isPending}>
            Log delay
          </Button>
        </div>
      )}

      {form === "pause" && (
        <div className="mt-3 space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[11px] text-muted-foreground">
              Paused from
              <Input
                type="date"
                value={pausedOn}
                onChange={(event) => setPausedOn(event.target.value)}
                className="mt-1 h-9 bg-background text-sm"
              />
            </label>
            <label className="block text-[11px] text-muted-foreground">
              Coming back on
              <Input
                type="date"
                value={returningOn}
                onChange={(event) => setReturningOn(event.target.value)}
                className="mt-1 h-9 bg-background text-sm"
              />
            </label>
          </div>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="Why the work is paused"
            className="bg-background text-xs"
          />
          <Button size="sm" onClick={savePause} disabled={pauseRows.add.isPending}>
            Log pause
          </Button>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {!delays.length && !pauses.length && (
          <p className="text-[12px] text-muted-foreground">
            Nothing logged — the journey is running to plan.
          </p>
        )}
        {pauses.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[12px]"
          >
            <PauseCircle className="size-3.5 text-primary" />
            <span className="num font-semibold">
              Paused {formatDate(row.paused_on)} →{" "}
              {row.returning_on ? formatDate(row.returning_on) : "return date to confirm"}
            </span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{row.reason}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {row.by_client ? "Client" : (row.logged_by ?? "Team")}
            </span>
            {!clientView && (
              <button
                type="button"
                onClick={() => pauseRows.remove.mutate(row.id)}
                aria-label="Remove pause"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        {delays
          .filter((row) => clientVisibleDelay(row.cause, row.client_visible, clientView))
          .map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-[12px]"
            >
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  row.cause === "client"
                    ? "bg-warning/15 text-warning"
                    : "bg-destructive/15 text-destructive",
                )}
              >
                {row.cause === "client" ? "Client" : "Us"} · +{row.days} days
              </span>
              <span className="num text-muted-foreground">
                {formatDate(row.occurred_on ?? row.created_at)}
              </span>
              <span className="min-w-0 flex-1 truncate">{row.reason}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {row.logged_by ?? ""}
              </span>
              {!clientView && (
                <button
                  type="button"
                  onClick={() => removeDelay.mutate(row.id)}
                  aria-label="Remove delay"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

/** A client only ever sees delays that were marked as shareable. */
function clientVisibleDelay(cause: string, visible: boolean, clientView: boolean) {
  if (!clientView) return true;
  return visible && cause === "client";
}
