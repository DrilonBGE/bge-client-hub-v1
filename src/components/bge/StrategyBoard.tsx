import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/bge/atoms";
import { EditRow, LongField, TextField } from "@/components/bge/fields";
import { useAddStrategy, useStrategy, useUpdateStrategy } from "@/lib/journey-queries";
import { formatDate, type StrategyRow } from "@/lib/journey";
import { logAudit, useUpdateClient } from "@/lib/queries";
import { uid, type CallReview, type Client } from "@/lib/bge";

import { cn } from "@/lib/utils";

type StrategyFields = {
  drive_link: string;
  existing_business: string;
  new_ideas: string;
  t: string;
  s: string;
  c: string;
  todo: string;
  other_notes: string;
  /** The day of the call, chosen by William — never filled in automatically. */
  call_date: string;
  /** The client's own notes and ideas — the only part they can write. */
  client_notes: string;
};

const EMPTY: StrategyFields = {
  drive_link: "",
  existing_business: "",
  new_ideas: "",
  t: "",
  s: "",
  c: "",
  todo: "",
  other_notes: "",
  call_date: "",
  client_notes: "",
};

const LONG_FIELDS: [keyof StrategyFields, string, string][] = [
  ["existing_business", "Notes about the existing business", "Where the business is today"],
  ["new_ideas", "Notes for new ideas", "Angles, offers, markets worth trying"],
  ["t", "T", "William's notes"],
  ["s", "S", "William's notes"],
  ["c", "C", "William's notes"],
  ["todo", "To-do list", "Everything that has to happen off the back of this"],
  ["other_notes", "Other notes", "Anything else"],
];

function parse(content: string | null): StrategyFields {
  if (!content) return { ...EMPTY };
  try {
    const parsed = JSON.parse(content) as Partial<StrategyFields>;
    if (parsed && typeof parsed === "object") return { ...EMPTY, ...parsed };
  } catch {
    return { ...EMPTY, other_notes: content };
  }
  return { ...EMPTY };
}

function VersionCard({
  row,
  client,
  defaultOpen,
  clientView = false,
}: {
  row: StrategyRow;
  client: Client;
  defaultOpen: boolean;
  clientView?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const update = useUpdateStrategy();
  const updateClient = useUpdateClient();
  const fields = parse(row.content);
  const when = fields.call_date ? formatDate(fields.call_date) : "Call date not set yet";

  const setField = (key: keyof StrategyFields, value: string) =>
    update.mutate({ id: row.id, patch: { content: JSON.stringify({ ...fields, [key]: value }) } });

  /** The call with William counts as a logged call, so keep the two in step. */
  const setCallDate = (value: string) => {
    setField("call_date", value);
    const calls = client.call_reviews ?? [];
    const found = calls.find((call) => call.type === "Onboarding Call");
    const next = found
      ? calls.map((call) => (call.id === found.id ? { ...call, date: value } : call))
      : [
          ...calls,
          {
            id: uid(),
            type: "Onboarding Call",
            date: value,
            who: "William",
            drive: fields.drive_link,
            fathom: "",
            notes: "",
            client_tasks: "",
            team_tasks: "",
          } as CallReview,
        ];
    updateClient.mutate({ id: client.id, patch: { call_reviews: next } as Partial<Client> });
  };

  if (clientView) {
    return (
      <section className="overflow-hidden rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40"
        >
          <span className="num text-sm font-semibold">Strategy V{row.version}</span>
          <span className="flex-1 text-[11px] text-muted-foreground">{when}</span>

          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        {open && (
          <div className="space-y-3 border-t border-border p-4">
            {LONG_FIELDS.filter(([key]) => fields[key]).map(([key, label]) => (
              <div key={key}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-0.5 whitespace-pre-line text-[13px]">{fields[key]}</p>
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                My own notes and ideas
              </p>
              <LongField
                value={fields.client_notes}
                placeholder="Anything you would like to add"
                onSave={(value) => setField("client_notes", value)}
              />
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40"
      >
        <span className="num text-sm font-semibold">Strategy V{row.version}</span>
        <span className="flex-1 text-[11px] text-muted-foreground">{when}</span>

        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-border p-4">
          <EditRow
            label="Date of the call with William"
            hint="William picks the day. It also shows up as the onboarding call in Client & team calls."
          >
            <TextField value={fields.call_date} type="date" onSave={setCallDate} />
          </EditRow>

          <EditRow
            label="Google Drive link to client notes"
            hint="Produced by William on the onboarding call."
          >
            <TextField
              value={fields.drive_link}
              placeholder="https://drive.google.com/…"
              onSave={(value) => setField("drive_link", value)}
            />
          </EditRow>

          {LONG_FIELDS.map(([key, label, placeholder]) => (
            <EditRow key={key} label={label}>
              <LongField
                value={fields[key]}
                placeholder={placeholder}
                onSave={(value) => setField(key, value)}
              />
            </EditRow>
          ))}

          <EditRow label="Price points">
            <LongField
              value={row.price_point}
              placeholder="What they charge, and for what"
              onSave={(price_point) => update.mutate({ id: row.id, patch: { price_point } })}
            />
          </EditRow>

          <EditRow label="Deliverables / what's included">
            <LongField
              value={row.deliverables}
              placeholder="Everything the client gets"
              onSave={(deliverables) => update.mutate({ id: row.id, patch: { deliverables } })}
            />
          </EditRow>
        </div>
      )}
    </section>
  );
}

/** Strategy V1 onwards. The client reads it; the team writes it. */
export function StrategyBoard({
  client,
  clientView = false,
}: {
  client: Client;
  clientView?: boolean;
}) {
  const { data: versions = [] } = useStrategy(client.id);
  const add = useAddStrategy();
  const next = (versions[0]?.version ?? 0) + 1;

  const create = () =>
    add.mutate(
      {
        client_id: client.id,
        version: next,
        content: JSON.stringify(EMPTY),
      },
      {
        onSuccess: () => {
          void logAudit("strategy_saved", client.name, `Version ${next}`);
          toast.success(`Strategy V${next} started.`);
        },
      },
    );

  return (
    <div className="max-w-3xl space-y-3">
      <p className="text-[12px] text-muted-foreground">
        {clientView
          ? "Everything from your strategy call with William. You can add your own notes at the bottom."
          : "The client can read the strategy. Only the team edits it."}
      </p>

      {versions.length === 0 ? (
        <EmptyState>
          {clientView
            ? "Your strategy will appear here after your call with William."
            : "No strategy yet — start V1."}
        </EmptyState>
      ) : (
        versions.map((row, index) => (
          <VersionCard
            key={row.id}
            row={row}
            client={client}
            defaultOpen={index === 0}
            clientView={clientView}
          />
        ))
      )}

      {!clientView && (
        <Button size="sm" onClick={create}>
          <Plus className="mr-1 size-4" /> Start Strategy V{next}
        </Button>
      )}
    </div>
  );
}
