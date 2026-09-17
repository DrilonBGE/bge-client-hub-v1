import { useMemo } from "react";
import { CalendarClock, Rocket, Star, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EditRow, SelectField, TextField } from "@/components/bge/fields";
import { RenewalNotes } from "@/components/bge/RenewalNotes";

import { TEAM, daysUntilLeaving, type Client } from "@/lib/bge";
import { formatDate } from "@/lib/journey";
import { useAds } from "@/lib/extras-queries";
import { useUpdateClient } from "@/lib/queries";
import { cn } from "@/lib/utils";

function Stat({ label, value, tone }: { label: string; value: string; tone?: string | undefined }) {
  return (
    <div className="bg-card px-3 py-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("num mt-1 text-sm font-semibold", tone)}>{value}</p>
    </div>
  );
}

function money(value: number) {
  return value ? `£${Math.round(value).toLocaleString("en-GB")}` : "—";
}

/**
 * Everything needed to walk into a renewal call prepared, plus the record of
 * why someone chose not to continue.
 */
export function RenewalPanel({ client }: { client: Client }) {
  const update = useUpdateClient();
  const { data: ads = [] } = useAds(client.id);
  const days = daysUntilLeaving(client);
  const save = (patch: Partial<Client>) => update.mutate({ id: client.id, patch });

  const totals = useMemo(() => {
    let spend = 0;
    let leads = 0;
    let revenue = 0;
    for (const row of ads as {
      spend?: number | null;
      leads?: number | null;
      revenue?: number | null;
    }[]) {
      spend += Number(row.spend ?? 0);
      leads += Number(row.leads ?? 0);
      revenue += Number(row.revenue ?? 0);
    }
    return { spend, leads, revenue };
  }, [ads]);

  const dueSoon = days !== null && days <= 14 && days >= 0;
  /** One shared answer, set on the journey banner and shown everywhere. */
  const launched = Boolean(client.launched);

  return (
    <div className="space-y-5">
      {dueSoon && (
        <div className="flex items-center gap-2 rounded-xl border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm text-warning">
          <CalendarClock className="size-4 shrink-0" />
          Renewal conversation window is open — {days} days until they are due to leave. This call
          stays human; nothing here is sent automatically.
        </div>
      )}

      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
        <Stat
          label="Renewal in"
          value={days === null ? "—" : `${days} days`}
          tone={dueSoon ? "text-warning" : undefined}
        />
        <Stat label="Phase" value={`${client.phase} of 6`} />
        <Stat
          label="Launched?"
          value={
            launched
              ? `Yes${client.launched_date ? ` · ${formatDate(client.launched_date)}` : ""}`
              : "Not yet"
          }
          tone={launched ? "text-success" : "text-muted-foreground"}
        />

        <Stat label="Ad spend" value={money(totals.spend)} />
        <Stat label="Leads" value={totals.leads ? String(totals.leads) : "—"} />
        <Stat label="Revenue" value={money(totals.revenue)} />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <EditRow label="Leaving date" internal>
          <TextField value={client.leaving} onSave={(leaving) => save({ leaving })} />
        </EditRow>
        <EditRow label="Contract value" internal>
          <TextField value={client.active} onSave={(active) => save({ active })} />
        </EditRow>
        <EditRow label="Renewal owner" internal>
          <SelectField
            value={client.renewal_team_member}
            options={TEAM}
            empty="Unassigned"
            onSave={(renewal_team_member) => save({ renewal_team_member })}
          />
        </EditRow>
        <EditRow label="Renewal talked?" internal>
          <SelectField
            value={client.renewal_talked}
            options={["Booked", "Talked", "Renewed", "Not renewing"]}
            empty="Not yet"
            onSave={(renewal_talked) => save({ renewal_talked })}
          />
        </EditRow>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
          <TrendingUp className="size-3.5 text-primary" /> Renewal plan
        </p>
        <p className="mb-2 text-[11px] text-muted-foreground">
          The same notes shown on the Renewals page — change them in either place.
        </p>
        <RenewalNotes client={client} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
            Who is having the conversation
          </p>
          <select
            value={client.renewal_owner ?? client.renewal_team_member ?? "Alfie"}
            onChange={(event) => save({ renewal_owner: event.target.value })}
            className="mb-3 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          >
            {TEAM.map((member) => (
              <option key={member}>{member}</option>
            ))}
          </select>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">
            Best renewal argument
          </label>
          <Textarea
            defaultValue={client.renewal_argument ?? ""}
            onBlur={(event) => save({ renewal_argument: event.target.value })}
            placeholder="The single strongest reason, backed by their own numbers."
            className="min-h-20 text-sm"
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <Rocket className="size-3.5 text-primary" /> Upsell & recognition
            </p>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">
              Mastermind
            </label>
            <select
              value={client.mastermind ?? "Not discussed"}
              onChange={(event) => save({ mastermind: event.target.value })}
              className="mb-3 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              {["Not discussed", "Potential", "Pitched", "Joined", "Declined"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => save({ case_study: !client.case_study })}
              className={cn(
                "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                client.case_study
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Star className={cn("size-4", client.case_study && "fill-current")} />
              {client.case_study
                ? "Flagged as a case study candidate"
                : "Flag as case study candidate"}
            </button>
          </div>

          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
              If they did not renew
            </p>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">
              Main reason
            </label>
            <Textarea
              defaultValue={client.cancel_reason ?? ""}
              onBlur={(event) => save({ cancel_reason: event.target.value })}
              placeholder="Price, results, timing, went in-house…"
              className="mb-3 min-h-16 text-sm"
            />
            <label className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">
              Recorded by
            </label>
            <Input
              defaultValue={client.cancel_recorded_by ?? ""}
              onBlur={(event) => save({ cancel_recorded_by: event.target.value })}
              placeholder="Name"
              className="h-9 text-sm"
            />
          </div>

          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
              Offboarding
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              They keep their portal, frozen exactly as it was. Their course access does not carry
              over.
            </p>
            <Button
              type="button"
              variant={client.podia_revoked ? "outline" : "default"}
              size="sm"
              onClick={() => save({ podia_revoked: !client.podia_revoked })}
            >
              {client.podia_revoked ? "Course access removed ✓" : "Mark course access removed"}
            </Button>
            {client.ex_client && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Left {formatDate(client.ex_client_date)} — record kept for good.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
