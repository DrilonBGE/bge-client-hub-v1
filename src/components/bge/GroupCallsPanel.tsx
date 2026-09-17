import { CalendarClock, Plus, Trash2, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, SectionCard } from "@/components/bge/atoms";
import {
  CALL_DAYS,
  effectiveCall,
  nextCallCountdown,
  useGroupCallMutations,
  useGroupCalls,
} from "@/lib/group-calls";

/**
 * The weekly group calls. Clients read them and join them; the team edits the
 * day, time, host and joining link in settings.
 */
export function GroupCallsPanel({ editable = false }: { editable?: boolean }) {
  const { data: calls = [], isLoading } = useGroupCalls();
  const { add, update, remove } = useGroupCallMutations();

  return (
    <SectionCard
      title="Weekly group calls"
      action={
        editable ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => add.mutate({ sort_order: calls.length })}
            disabled={add.isPending}
          >
            <Plus className="size-3.5" /> Add a call
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading the call times…</p>
      ) : !calls.length ? (
        <EmptyState>
          {editable
            ? "No group calls yet — add the day, the time, the host and the joining link."
            : "Your BGE contact will add the call times shortly."}
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => {
            const temp = effectiveCall(call);
            const raw = call as typeof call & {
              temp_day?: string | null;
              temp_time?: string | null;
              temp_note?: string | null;
            };
            const tempDay = raw.temp_day;
            const tempTime = raw.temp_time;
            const tempNoteValue = raw.temp_note;
            return (
              <div key={call.id} className="rounded-lg border border-border bg-card p-3">
                {editable ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                    <Input
                      className="lg:col-span-2"
                      defaultValue={call.title ?? ""}
                      placeholder="Call name"
                      onBlur={(event) =>
                        update.mutate({ id: call.id, patch: { title: event.target.value } })
                      }
                    />
                    <select
                      defaultValue={call.day ?? ""}
                      onChange={(event) =>
                        update.mutate({ id: call.id, patch: { day: event.target.value || null } })
                      }
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">Day</option>
                      {CALL_DAYS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                    <Input
                      defaultValue={call.time ?? ""}
                      placeholder="Time (e.g. 6pm UK)"
                      onBlur={(event) =>
                        update.mutate({ id: call.id, patch: { time: event.target.value } })
                      }
                    />
                    <Input
                      defaultValue={call.host ?? ""}
                      placeholder="Host"
                      onBlur={(event) =>
                        update.mutate({ id: call.id, patch: { host: event.target.value } })
                      }
                    />
                    <div className="flex gap-2">
                      <Input
                        defaultValue={call.join_url ?? ""}
                        placeholder="Joining link"
                        onBlur={(event) =>
                          update.mutate({ id: call.id, patch: { join_url: event.target.value } })
                        }
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Remove this call"
                        onClick={() => remove.mutate(call.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <Input
                      className="lg:col-span-6"
                      defaultValue={call.note ?? ""}
                      placeholder="What this call covers"
                      onBlur={(event) =>
                        update.mutate({ id: call.id, patch: { note: event.target.value } })
                      }
                    />

                    {/* A one-off change for a week when the usual time will not work. */}
                    <div className="rounded-md border border-dashed border-border p-2 lg:col-span-6">
                      <label className="flex items-center gap-2 text-[12px] font-semibold">
                        <input
                          type="checkbox"
                          checked={Boolean(temp.temporary)}
                          onChange={(event) =>
                            update.mutate({
                              id: call.id,
                              patch: { temp_active: event.target.checked } as never,
                            })
                          }
                        />
                        This week only — different day or time
                      </label>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        <select
                          defaultValue={tempDay ?? ""}
                          onChange={(event) =>
                            update.mutate({
                              id: call.id,
                              patch: { temp_day: event.target.value || null } as never,
                            })
                          }
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="">Same day</option>
                          {CALL_DAYS.map((day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                        <Input
                          defaultValue={tempTime ?? ""}
                          placeholder="New time"
                          onBlur={(event) =>
                            update.mutate({
                              id: call.id,
                              patch: { temp_time: event.target.value } as never,
                            })
                          }
                        />
                        <Input
                          defaultValue={tempNoteValue ?? ""}
                          placeholder="What to tell the clients"
                          onBlur={(event) =>
                            update.mutate({
                              id: call.id,
                              patch: { temp_note: event.target.value } as never,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:flex sm:flex-wrap sm:items-center">
                    <CalendarClock className="size-4 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{call.title}</span>
                        {nextCallCountdown(temp.day) && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                            {nextCallCountdown(temp.day)}
                            {temp.time ? ` · ${temp.time}` : ""}
                          </span>
                        )}
                        {temp.temporary && (
                          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning">
                            Changed this week
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {[temp.day, temp.time, call.host ? `with ${call.host}` : null]
                          .filter(Boolean)
                          .join(" · ") || "Time to be confirmed"}
                      </span>
                      {temp.note && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {temp.note}
                        </span>
                      )}
                    </span>
                    {call.join_url && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="col-start-2 w-fit sm:col-start-auto"
                      >
                        <a href={call.join_url} target="_blank" rel="noreferrer">
                          <Video className="size-3.5" /> Join
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
