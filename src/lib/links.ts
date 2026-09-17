import { supabase } from "@/integrations/supabase/client";
import { uid, type Client, type WebLink } from "@/lib/bge";
import { ASSET_SLOTS, roadmapKind } from "@/lib/journey-steps";

export type LinkGroupKey = "client_web" | "bge_funnel" | "ads" | "documents" | "internal";

/** Documents the client fills in during onboarding, mirrored from their journey steps. */
export const JOURNEY_DOCUMENT_LABELS: Record<string, string> = {
  "p1-blueprint": "Client Blueprint Document",
  "p1-information-doc": "Client Information Document",
};

/** Everything that becomes a final, approved deliverable. */
export const FINAL_COPY_LABELS = [
  "Final VSL copy",
  "Final ads copy",
  "Final thank you page / next steps copy",
  "Final 9 frequently asked questions document",
  "Final pre-call email sequence",
  "Final cancellation email sequence",
  "Final no-show email sequence",
  "Final post-call no-close email sequence",
];

export const FINAL_RECORDING_LABELS = ASSET_SLOTS.map((slot) => `Final recording — ${slot}`);
export const FINAL_EDIT_LABELS = ASSET_SLOTS.map((slot) => `Final edit — ${slot}`);

/**
 * Copies a link or a final version into the client's documents list, so it
 * always shows up under key links without anyone re-typing it.
 */
export async function mirrorDocumentLink(
  clientId: string,
  label: string,
  url: string,
  group: LinkGroupKey = "documents",
) {
  const { data } = await supabase
    .from("clients")
    .select("web_links")
    .eq("id", clientId)
    .maybeSingle();
  const links = ((data?.web_links as WebLink[] | null) ?? []).filter(Boolean);
  const found = links.find(
    (link) => link.label === label && (link.group ?? "client_web") === group,
  );
  const next = found
    ? links.map((link) => (link.id === found.id ? { ...link, url } : link))
    : [...links, { id: uid(), label, url, group }];
  await supabase
    .from("clients")
    .update({ web_links: next as never })
    .eq("id", clientId);
}

/** Files a finished deliverable under key links and documents. */
export async function mirrorFinalDeliverable(
  clientId: string,
  label: string,
  value: string,
  group: LinkGroupKey = "documents",
) {
  if (!value?.trim()) return;
  await mirrorDocumentLink(clientId, label, value.trim(), group);
}

/** Reads a link back out of the client's list, so both places show the same thing. */
export function findLinkUrl(client: Client, label: string): string | null {
  const found = (client.web_links ?? []).find((link) => link.label === label && link.url);
  return found?.url ?? null;
}

export type LinkGroup = {
  key: LinkGroupKey;
  title: string;
  blurb: string;
  internal: boolean;
  /** Slots that always show, whether they are filled in or not. */
  standard: string[];
};

export const LINK_GROUPS: LinkGroup[] = [
  {
    key: "client_web",
    title: "Their own pages",
    blurb: "The client's existing website and social profiles. Both sides can edit these.",
    internal: false,
    standard: [
      "Current funnel website",
      "YouTube",
      "Instagram",
      "Facebook",
      "LinkedIn",
      "Twitter / X",
      "Existing website",
    ],
  },
  {
    key: "bge_funnel",
    title: "BGE funnel links",
    blurb: "The pages we build for them — filled in when the funnel is signed off.",
    internal: false,
    standard: [
      "VSL landing page",
      "Schedule page",
      "Thank you page",
      "Email sequences set up",
      "Calendar set up",
      "Final Amalor and funnel build checks",
      "Amalor quick link",
    ],
  },
  {
    key: "ads",
    title: "Ads",
    blurb: "Download the tracker template, then paste the client's own sheet link here.",
    internal: false,
    standard: ["Client ads tracker (Google Sheet)"],
  },
  {
    key: "documents",
    title: "Client documents and final versions",
    blurb: "Filled in on the journey — approved final versions appear here automatically.",
    internal: false,
    standard: [
      "Client Blueprint Document",
      "Client Information Document",
      "YouTube competitor analysis (completed)",
      "BGE content feedback and strategy",
      ...FINAL_COPY_LABELS,
      ...FINAL_RECORDING_LABELS,
      ...FINAL_EDIT_LABELS,
    ],
  },
  {
    key: "internal",
    title: "Internal only",
    blurb: "Never shown to the client.",
    internal: true,
    standard: ["Google Drive folder"],
  },
];

/** Links belonging to a group, standard slots first and in order. */
export function groupLinks(client: Client, group: LinkGroup) {
  const all: WebLink[] = client.web_links ?? [];
  const mine = all.filter((link) => (link.group ?? "client_web") === group.key);
  const standard = group.standard.map(
    (label) =>
      mine.find((link) => link.label === label) ?? {
        id: `slot-${group.key}-${label}`,
        label,
        url: "",
        group: group.key,
      },
  );
  const custom = mine.filter((link) => !group.standard.includes(link.label));
  return { standard, custom };
}

/** Writes one link back into the client's whole list. */
export function setLink(client: Client, link: WebLink, patch: Partial<WebLink>): WebLink[] {
  const all: WebLink[] = client.web_links ?? [];
  const exists = all.some((item) => item.id === link.id);
  if (exists) return all.map((item) => (item.id === link.id ? { ...item, ...patch } : item));
  return [...all, { ...link, ...patch, id: uid() }];
}

export function addCustomLink(client: Client, group: LinkGroupKey): WebLink[] {
  return [...(client.web_links ?? []), { id: uid(), label: "", url: "", group }];
}

export function removeLink(client: Client, id: string): WebLink[] {
  return (client.web_links ?? []).filter((item) => item.id !== id);
}

const ADS_TRACKER: Record<string, string> = {
  dfy: "https://docs.google.com/spreadsheets/d/1xgwl2ckyPmeMB89TjY6actI954-HXCNX/edit?usp=sharing&ouid=107202562071270956668&rtpof=true&sd=true",
  dwy: "https://docs.google.com/spreadsheets/d/1zJuL0CvUVDVq3fh8ExHqMh-rpT-xTWKn/edit?usp=sharing&ouid=107202562071270956668&rtpof=true&sd=true",
};

/** The ads tracker template for the roadmap this client is on. */
export function adsTrackerUrl(client: {
  program?: string | null;
  roadmap_program?: string | null;
}) {
  return ADS_TRACKER[roadmapKind(client)] ?? ADS_TRACKER["dfy"]!;
}
