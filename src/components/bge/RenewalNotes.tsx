import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/components/bge/atoms";
import { useUpdateClient } from "@/lib/queries";
import type { Client } from "@/lib/bge";

/**
 * The renewal notes block, shared by the renewals page and the client
 * workspace so both sides always show exactly the same thing.
 */
export function RenewalNotes({ client }: { client: Client }) {
  const update = useUpdateClient();
  const save = (patch: Partial<Client>) => update.mutate({ id: client.id, patch });

  return (
    <div className="grid overflow-hidden rounded-lg border border-border md:grid-cols-2 md:divide-x md:divide-border">
      <div className="bg-card p-3">
        <FieldLabel>Notes / ideas about renewal</FieldLabel>
        <Textarea
          key={`notes-${client.id}`}
          defaultValue={client.renewal_notes ?? ""}
          onBlur={(e) => save({ renewal_notes: e.target.value })}
          placeholder="What we know, what we would pitch, what they care about…"
          className="min-h-28 bg-background text-[13px]"
        />
      </div>

      <div className="space-y-2 bg-primary/8 p-3">
        <div>
          <FieldLabel>New renewal contract discussed</FieldLabel>
          <Textarea
            key={`contract-${client.id}`}
            defaultValue={client.renewal_new_contract ?? ""}
            onBlur={(e) => save({ renewal_new_contract: e.target.value })}
            placeholder="Terms, length, price point agreed or proposed…"
            className="min-h-16 bg-card text-[13px]"
          />
        </div>
        <div>
          <FieldLabel>Value leaving</FieldLabel>
          <Input
            key={`value-${client.id}`}
            defaultValue={client.renewal_value_leaving ?? ""}
            onBlur={(e) => save({ renewal_value_leaving: e.target.value })}
            placeholder="£"
            className="h-8 bg-card text-[13px]"
          />
        </div>
        <div>
          <FieldLabel>Other notes</FieldLabel>
          <Textarea
            key={`other-${client.id}`}
            defaultValue={client.renewal_other_notes ?? ""}
            onBlur={(e) => save({ renewal_other_notes: e.target.value })}
            placeholder="Anything else the team should know before the call"
            className="min-h-16 bg-card text-[13px]"
          />
        </div>
      </div>
    </div>
  );
}
