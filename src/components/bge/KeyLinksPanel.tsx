import { useEffect, useState } from "react";
import { Download, ExternalLink, Lock, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateClient } from "@/lib/queries";
import {
  LINK_GROUPS,
  adsTrackerUrl,
  addCustomLink,
  groupLinks,
  removeLink,
  setLink,
} from "@/lib/links";
import type { LinkGroup } from "@/lib/links";
import type { Client, WebLink } from "@/lib/bge";
import { cn } from "@/lib/utils";

function LinkLine({
  link,
  editableLabel,
  readOnly = false,
  showSubmitter = false,
  onSave,
  onRemove,
}: {
  link: WebLink;
  editableLabel?: boolean;
  readOnly?: boolean;
  showSubmitter?: boolean;
  onSave: (patch: Partial<WebLink>) => void;
  onRemove?: () => void;
}) {
  const [label, setLabel] = useState(link.label);
  const [url, setUrl] = useState(link.url);
  const [saved, setSaved] = useState(false);
  const changed = label !== link.label || url !== link.url;

  useEffect(() => {
    setLabel(link.label);
    setUrl(link.url);
  }, [link.label, link.url]);

  const commit = () => {
    if (!changed) return;
    onSave({ label, url });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2">
      {readOnly ? (
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold">{link.label}</span>
          {showSubmitter && (
            <span className="block text-[11px] text-muted-foreground">
              {link.submitted_by === "client" ? "You submitted it" : "BGE submitted it"}
            </span>
          )}
        </span>
      ) : editableLabel ? (
        <Input
          value={label}
          placeholder="Title"
          onChange={(event) => setLabel(event.target.value)}
          onBlur={commit}
          className="h-8 w-44 bg-background text-[13px]"
        />
      ) : (
        <span className="w-44 shrink-0 text-[12px] font-semibold">{link.label}</span>
      )}
      {!readOnly && (
        <>
          <Input
            value={url}
            placeholder="Paste the link"
            onChange={(event) => setUrl(event.target.value)}
            onBlur={commit}
            className="h-8 min-w-40 flex-1 bg-background text-[13px]"
          />
          <Button
            type="button"
            size="sm"
            variant={changed ? "default" : "ghost"}
            disabled={!changed}
            onClick={commit}
            className="h-8 text-[10px] font-bold uppercase tracking-wide"
          >
            {saved && !changed ? "Saved" : "Save"}
          </Button>
        </>
      )}
      {link.url ? (
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-primary"
          aria-label={`Open ${link.label || "link"}`}
        >
          <ExternalLink className="size-4" />
        </a>
      ) : null}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Remove link"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}

export function LinkGroupSection({
  client,
  group,
  clientView = false,
  readOnly = false,
  hideEmpty = false,
  showSubmitter = false,
}: {
  client: Client;
  group: LinkGroup;
  clientView?: boolean;
  readOnly?: boolean;
  hideEmpty?: boolean;
  showSubmitter?: boolean;
}) {
  const update = useUpdateClient();
  const saveAll = (web_links: WebLink[]) =>
    update.mutate({ id: client.id, patch: { web_links } as Partial<Client> });
  const grouped = groupLinks(client, group);
  const standard = hideEmpty ? grouped.standard.filter((link) => link.url) : grouped.standard;
  const custom = hideEmpty ? grouped.custom.filter((link) => link.url) : grouped.custom;

  return (
    <section
      className={cn(
        "rounded-xl border p-4",
        group.internal ? "border-dashed border-border bg-muted/40" : "border-border",
      )}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">{group.title}</h3>
        {group.internal && (
          <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
            <Lock className="size-2.5" /> Internal
          </span>
        )}
      </div>
      <p className="mb-3 text-[12px] text-muted-foreground">{group.blurb}</p>

      {group.key === "ads" && (
        <div className="mb-3 space-y-2 rounded-lg border border-border bg-card p-3">
          <Button asChild size="sm" variant="outline">
            <a href={adsTrackerUrl(client)} target="_blank" rel="noreferrer">
              <Download className="mr-1 size-4" /> Open the ads tracker template
            </a>
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Please make sure this Google Sheet is shared so anyone with the link can open it — not
            restricted.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {standard.length === 0 && custom.length === 0 && (
          <p className="text-[12px] text-muted-foreground">Nothing shared here yet.</p>
        )}
        {standard.map((link) => (
          <LinkLine
            key={link.id}
            link={link}
            readOnly={readOnly}
            showSubmitter={showSubmitter}
            onSave={(patch) =>
              saveAll(
                setLink(client, link, {
                  ...patch,
                  submitted_by: clientView ? "client" : "bge",
                }),
              )
            }
          />
        ))}
        {custom.map((link) => (
          <LinkLine
            key={link.id}
            link={link}
            editableLabel
            readOnly={readOnly}
            showSubmitter={showSubmitter}
            onSave={(patch) =>
              saveAll(
                setLink(client, link, {
                  ...patch,
                  submitted_by: clientView ? "client" : "bge",
                }),
              )
            }
            onRemove={() => saveAll(removeLink(client, link.id))}
          />
        ))}
      </div>

      {!readOnly && (
        <Button
          size="sm"
          variant="ghost"
          className="mt-2"
          onClick={() => saveAll(addCustomLink(client, group.key))}
        >
          <Plus className="mr-1 size-4" /> Add a link
        </Button>
      )}
    </section>
  );
}

/** Every link and document for a client, grouped by who it belongs to. */
export function KeyLinksPanel({
  client,
  clientView = false,
  readOnly = false,
  hideEmpty = false,
  showSubmitter = false,
}: {
  client: Client;
  /** The client never sees the internal-only group. */
  clientView?: boolean;
  readOnly?: boolean;
  hideEmpty?: boolean;
  showSubmitter?: boolean;
}) {
  const groups = clientView ? LINK_GROUPS.filter((group) => !group.internal) : LINK_GROUPS;
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <LinkGroupSection
          key={group.key}
          client={client}
          group={group}
          clientView={clientView}
          readOnly={readOnly}
          hideEmpty={hideEmpty}
          showSubmitter={showSubmitter}
        />
      ))}
    </div>
  );
}
