import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/bge/atoms";
import { EditRow, LongField, SelectField } from "@/components/bge/fields";
import { ShowMore } from "@/components/bge/ShowMore";
import { useUpdateClient } from "@/lib/queries";
import { CALL_TYPES, TEAM, uid, type CallReview, type Client } from "@/lib/bge";

const ORDINALS = [
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
  "Ninth",
  "Tenth",
  "Eleventh",
  "Twelfth",
];

/** "First call", "Second call" … in the order the calls actually happened. */
function callNumbers(calls: CallReview[]) {
  const ordered = [...calls].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const map = new Map<string, string>();
  ordered.forEach((call, index) => {
    map.set(call.id, `${ORDINALS[index] ?? `Call ${index + 1}`} call`);
  });
  return map;
}

/** What the client sees: every call in order, oldest first, read only. */
function ClientCall({
  call,
  number,
  onSave,
}: {
  call: CallReview;
  number: string;
  onSave: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(call.client_extra_notes ?? "");
  const changed = notes !== (call.client_extra_notes ?? "");
  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">
          {number} — {call.type}
        </p>
        <p className="num text-[11px] text-muted-foreground">
          {call.date || "Date to confirm"}
          {call.who ? ` · ${call.who}` : ""}
        </p>
      </div>
      {call.type === "Onboarding Call" ? (
        <p className="text-[12px] text-muted-foreground">For details, see the Strategy tab.</p>
      ) : (
        <>
          {call.notes && <p className="text-[12px] text-muted-foreground">{call.notes}</p>}
          {call.client_tasks && (
            <p className="text-[12px]">
              <span className="font-semibold">Your next steps: </span>
              {call.client_tasks}
            </p>
          )}
          {call.fathom && (
            <a
              href={call.fathom}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[12px] text-primary"
            >
              <ExternalLink className="size-3.5" /> Open recording
            </a>
          )}
        </>
      )}

      <div className="border-t border-border pt-2">
        <label className="text-[11px] font-semibold text-muted-foreground">
          Add any extra notes you would like
        </label>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          className="mt-1 bg-background text-xs"
        />
        <Button size="sm" className="mt-2" disabled={!changed} onClick={() => onSave(notes)}>
          Save my notes
        </Button>
      </div>
    </div>
  );
}

function ClientCalls({
  calls,
  onSave,
}: {
  calls: CallReview[];
  onSave: (id: string, notes: string) => void;
}) {
  const ordered = [...calls].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const numbers = callNumbers(calls);

  if (!ordered.length) return <EmptyState>No calls logged yet.</EmptyState>;

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground">
        {ordered.length} {ordered.length === 1 ? "call" : "calls"} so far, oldest first.
      </p>
      <ShowMore
        items={ordered}
        limit={3}
        noun="more calls"
        render={(call) => (
          <ClientCall
            key={call.id}
            call={call}
            number={numbers.get(call.id) ?? "Call"}
            onSave={(notes) => onSave(call.id, notes)}
          />
        )}
      />
    </div>
  );
}

/** Calls the client can read but never add to — only the team writes here. */
export function CallsPanel({
  client,
  clientView = false,
}: {
  client: Client;
  clientView?: boolean;
}) {
  const update = useUpdateClient();
  const calls = client.call_reviews ?? [];
  const saveAll = (call_reviews: CallReview[]) =>
    update.mutate({ id: client.id, patch: { call_reviews } as Partial<Client> });
  const set = (id: string, patch: Partial<CallReview>) =>
    saveAll(calls.map((call) => (call.id === id ? { ...call, ...patch } : call)));
  if (clientView) {
    return (
      <ClientCalls
        calls={calls}
        onSave={(id, client_extra_notes) => set(id, { client_extra_notes })}
      />
    );
  }

  const addCall = () =>
    saveAll([
      {
        id: uid(),
        type: CALL_TYPES[0],
        date: "",
        who: TEAM[0],
        drive: "",
        fathom: "",
        notes: "",
        client_tasks: "",
        team_tasks: "",
      },
      ...calls,
    ]);

  const numbers = callNumbers(calls);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-muted-foreground">
          {calls.length} {calls.length === 1 ? "call" : "calls"} logged. The client can read every
          call here — only the team adds or edits them.
        </p>
        <Button size="sm" onClick={addCall}>
          <Plus className="mr-1 size-4" /> Log a call
        </Button>
      </div>

      {calls.length === 0 ? (
        <EmptyState>No calls logged yet.</EmptyState>
      ) : (
        <ShowMore
          items={calls}
          limit={3}
          noun="more calls"
          render={(call) => (
            <div key={call.id} className="space-y-2.5 rounded-xl border border-border p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                {numbers.get(call.id) ?? "Call"}
              </p>
              <div className="grid gap-2.5 sm:grid-cols-3">
                <EditRow label="Call type">
                  <SelectField
                    value={call.type}
                    options={CALL_TYPES}
                    onSave={(type) => set(call.id, { type })}
                  />
                </EditRow>
                <EditRow label="Date">
                  <Input
                    type="date"
                    value={call.date ?? ""}
                    onChange={(event) => set(call.id, { date: event.target.value })}
                    className="h-9 bg-background text-sm"
                  />
                </EditRow>
                <EditRow label="Who ran it">
                  <SelectField
                    value={call.who}
                    options={TEAM}
                    onSave={(who) => set(call.id, { who })}
                  />
                </EditRow>
              </div>
              {call.type === "Onboarding Call" ? (
                <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
                  For details, see the Strategy tab.
                </p>
              ) : (
                <>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <EditRow label="Recording link">
                      <Input
                        key={`${call.id}-fathom`}
                        defaultValue={call.fathom ?? ""}
                        placeholder="Fathom or Drive link"
                        onBlur={(event) => set(call.id, { fathom: event.target.value })}
                        className="h-9 bg-background text-sm"
                      />
                    </EditRow>
                    <EditRow label="Notes link">
                      <Input
                        key={`${call.id}-drive`}
                        defaultValue={call.drive ?? ""}
                        placeholder="Google Drive notes"
                        onBlur={(event) => set(call.id, { drive: event.target.value })}
                        className="h-9 bg-background text-sm"
                      />
                    </EditRow>
                  </div>
                  <EditRow label="What was said">
                    <LongField value={call.notes} onSave={(notes) => set(call.id, { notes })} />
                  </EditRow>
                  {call.client_extra_notes && (
                    <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
                      <span className="font-semibold text-primary">Client's extra notes: </span>
                      {call.client_extra_notes}
                    </div>
                  )}
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <EditRow label="Their next steps">
                      <LongField
                        value={call.client_tasks}
                        rows={2}
                        onSave={(client_tasks) => set(call.id, { client_tasks })}
                      />
                    </EditRow>
                    <EditRow label="Our next steps">
                      <LongField
                        value={call.team_tasks}
                        rows={2}
                        onSave={(team_tasks) => set(call.id, { team_tasks })}
                      />
                    </EditRow>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                {call.fathom && (
                  <a
                    href={call.fathom}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] text-primary"
                  >
                    <ExternalLink className="size-3.5" /> Open recording
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => saveAll(calls.filter((item) => item.id !== call.id))}
                  className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
