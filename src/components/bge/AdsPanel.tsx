import { ExternalLink, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateClient } from "@/lib/queries";

import type { Client } from "@/lib/bge";
import { adsTrackerUrl } from "@/lib/links";

/** The ads tracker: our template, and the sheet the client fills in themselves. */
export function AdsPanel({ client, clientView = false }: { client: Client; clientView?: boolean }) {
  const update = useUpdateClient();

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <p className="eyebrow">Ad performance</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Download the tracker template, fill it in each week, then paste the link to your own copy
          here so we can both see the numbers.
        </p>
      </div>

      <div className="rounded-xl border border-border p-4">
        <p className="text-sm font-semibold">The template</p>
        <Button asChild size="sm" variant="ghost" className="mt-2 border border-border">
          <a href={adsTrackerUrl(client)} target="_blank" rel="noreferrer">
            <FileSpreadsheet className="mr-1 size-3.5" /> Ads tracker template
          </a>
        </Button>
      </div>

      <div className="rounded-xl border border-border p-4">
        <p className="text-sm font-semibold">
          {clientView ? "Your ad tracker" : "The client's ad tracker"}
        </p>
        <Input
          key={`ads-${client.ads_sheet_url ?? ""}`}
          defaultValue={client.ads_sheet_url ?? ""}
          placeholder="https://docs.google.com/spreadsheets/…"
          onBlur={(event) => {
            if ((client.ads_sheet_url ?? "") === event.target.value) return;
            update.mutate({
              id: client.id,
              patch: { ads_sheet_url: event.target.value || null } as Partial<Client>,
            });
          }}
          className="mt-2 h-9 bg-background text-sm"
        />
        {client.ads_sheet_url && (
          <a
            href={client.ads_sheet_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[12px] text-primary"
          >
            <ExternalLink className="size-3.5" /> Open the tracker
          </a>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Charts and live numbers will be added to this tab later on.
        </p>
      </div>
    </div>
  );
}
