import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { TaskRow } from "@/lib/journey";

type TaskInsert = Database["public"]["Tables"]["client_tasks"]["Insert"];

/** The three delivery paths. A client on a mix takes the highest one. */
export type ProgramKind = "dfy" | "dwy" | "dby";

/**
 * Which roadmap a client gets. "Done for you / Done with you" gets the
 * Done for you roadmap, because that is the highest tier they hold.
 */
export function programKind(program?: string | null): ProgramKind {
  const value = (program ?? "").toLowerCase();
  if (!value) return "dfy";
  if (value.includes("dfy") || value.includes("for you")) return "dfy";
  if (value.includes("dwy") || value.includes("with you")) return "dwy";
  if (value.includes("dby") || value.includes("diy") || value.includes("by you")) return "dby";
  return "dfy";
}

/**
 * Which roadmap a client is actually working through. A client's package can be
 * changed (say Done for you → Done with you) while their roadmap stays as it was,
 * so no work already done on the old roadmap is lost.
 */
export function roadmapKind(client: {
  program?: string | null;
  roadmap_program?: string | null;
}): ProgramKind {
  return programKind(client.roadmap_program ?? client.program);
}

/** Who is allowed to move the three-state control on a step. */
export type StepKind = "client" | "team" | "either";

export type StepSpec = {
  key: string;
  title: string;
  kind: StepKind;
  /** Fixed owner label, or resolved from the client's copy writer. */
  owner?: string;
  ownerFromVslWriter?: boolean;
  instructions?: string;
  templateLabel?: string;
  /** A real template file once we have one; null shows "template coming soon". */
  templateUrl?: string | null;
  /** A different template per delivery path, used ahead of templateUrl. */
  templateUrls?: Partial<Record<ProgramKind, string>>;
  /** Shows the "insert completed version here" box. */
  submission?: boolean;
  /** Shows the copywriting slots and the approval loop. */
  copyDesk?: boolean;
  /** Shows the video slots with drafts, review rounds and notes. */
  assetDesk?: boolean;
  /** Shows the six funnel pages Drilon signs off before launch. */
  funnelDesk?: boolean;
  /** Only Drilon can move this one on. */
  drilonOnly?: boolean;
  /** Moves along on its own with time once the funnel is live. */
  automatic?: boolean;
  /** A product the client signs up to, with an opt-out questionnaire. */
  signUp?: SignUpSpec;
  /** The YouTube competitor analysis and content plan step. */
  contentPlan?: boolean;
  /** Shows the four welcome documents to read, understand and tick. */
  welcomeDocs?: boolean;
  /** Only appears when the content plan has been switched on for this client. */
  contentPlanOnly?: boolean;
  /** Which delivery paths this step belongs to. Missing means all of them. */
  tiers?: ProgramKind[];
  /** Only these pieces of copy show on this step's copy desk. */
  copySlots?: string[];

  timelineNote?: string;
};

/** One of the three products a client can take on, or explain away. */
export type SignUpSpec = {
  /** The column on the client this answer is kept in. */
  field: "amalor" | "sss" | "commas";
  product: string;
  /** Where they sign up. Null until we have the exact address. */
  url: string | null;
  /** A how-to guide, when we have one. */
  guideUrl?: string | null;
  /** The line shown above the opt-out box. */
  optOutHint: string;
  /** What we need them to confirm they understand. */
  warning: string;
};

/** The eight copy deliverables of the copywriting step. */
export const COPY_SLOTS = [
  "VSL Copy",
  "Ads Copy",
  "TY Page Video Copy",
  "9 FAQ Videos Copy",
  "Pre call email sequence copy",
  "Cancellation email sequence copy",
  "No show email sequence copy",
  "Post call no close email sequence copy",
] as const;

export type CopyApproval = "pending" | "approved" | "edited";

/** One round of a piece of copy: our version, the client's answer, our reply. */
export type CopyRound = {
  /** The copy itself, or a link to it. */
  text?: string;
  /** Our notes about that piece of copy. */
  note?: string;
  /** Which team member wrote it. */
  by?: string;
  /** Locked in the app, ready to send. */
  locked?: boolean;
  submittedAt?: string;
  submittedBy?: string;
  /** The client's choice, only final once they press send. */
  decision?: "approved" | "comments" | "edited";
  /** The client's comments, or notes on their own final version. */
  clientNote?: string;
  /** The client's own final version. */
  clientText?: string;
  /** When the client pressed send on their review. */
  clientSentAt?: string;
  /** Our answer to a client's own final version. */
  teamDecision?: "approved" | "revise";
};

/** A copy deliverable is a stack of rounds: V1, V2, V3 … */
export type CopySlotState = CopyRound & { rounds?: CopyRound[] };

/** Every round of a slot, oldest first. Old flat records count as round one. */
export function copyRounds(slot?: CopySlotState): CopyRound[] {
  if (!slot) return [{}];
  if (slot.rounds?.length) return slot.rounds;
  const { rounds: _ignored, ...flat } = slot;
  return [flat];
}

export function latestCopyRound(slot?: CopySlotState): CopyRound {
  const rounds = copyRounds(slot);
  return rounds[rounds.length - 1] ?? {};
}

/** Nothing more to do on this piece of copy. */
export function copySlotClosed(slot?: CopySlotState) {
  const last = latestCopyRound(slot);
  if (last.decision === "approved" && last.clientSentAt) return true;
  if (last.decision === "edited" && last.teamDecision === "approved") return true;
  return false;
}

/** The final wording of a piece of copy, once it is settled. */
export function finalCopy(slot?: CopySlotState) {
  const last = latestCopyRound(slot);
  if (!copySlotClosed(slot)) return "";
  return last.decision === "edited" ? (last.clientText ?? last.text ?? "") : (last.text ?? "");
}

export function versionLabel(name: string, index: number) {
  return index === 0 ? name : `${name} V${index + 1}`;
}

/** The four video deliverables recorded and then edited in phase 2. */
export const ASSET_SLOTS = ["VSL Video", "Ads Videos", "TY Page Video", "9 FAQ Videos"] as const;

/** One draft round of a video asset. */
export type AssetDraft = {
  /** The link the client sends over. */
  url?: string;
  /** Their notes and thoughts on it. */
  note?: string;
  /** When they pressed send — after this it is awaiting our review. */
  sentAt?: string;
  review?: "approved" | "revision";
  /** What we would like changed. */
  reviewNote?: string;
  /** When we sent our review back. */
  reviewSentAt?: string;
};

export type AssetReview = {
  drafts?: AssetDraft[];
  /** Older records: a single draft and final link. */
  draft?: string;
  final?: string;
  approval?: "pending" | "approved" | "revision";
  note?: string;
};

export function assetDrafts(asset?: AssetReview): AssetDraft[] {
  if (asset?.drafts?.length) return asset.drafts;
  const legacy: AssetDraft[] = [];
  if (asset?.draft) {
    const first: AssetDraft = { url: asset.draft, sentAt: "legacy" };
    if (asset.approval === "approved" || asset.approval === "revision")
      first.review = asset.approval;
    if (asset.note) {
      first.reviewNote = asset.note;
      first.reviewSentAt = "legacy";
    }
    legacy.push(first);
  }
  if (asset?.final) legacy.push({ url: asset.final, sentAt: "legacy" });
  return legacy.length ? legacy : [{}];
}

export function latestAssetDraft(asset?: AssetReview): AssetDraft {
  const drafts = assetDrafts(asset);
  return drafts[drafts.length - 1] ?? {};
}

export function assetApproved(asset?: AssetReview) {
  return latestAssetDraft(asset).review === "approved";
}

/** The pages and set-up Drilon checks before anything goes live. */
export const FUNNEL_SLOTS = [
  "VSL landing page",
  "Schedule page",
  "Thank you page",
  "Email sequences set up",
  "Calendar set up",
  "Final Amalor and funnel build checks",
] as const;

export type FunnelSlotState = { url?: string; note?: string; approved?: boolean };

export type StepPayload = {
  /** Our drafts, keyed by the slot name. */
  team?: Record<string, string>;
  /** The client's returned version, keyed by the slot name. */
  client?: Record<string, string>;
  approval?: CopyApproval;
  finalUrl?: string;
  /** Phase 2 video review, keyed by the asset slot name. */
  assets?: Record<string, AssetReview>;
  /** Phase 1 copy desk, keyed by the copy slot name. */
  slots?: Record<string, CopySlotState>;
  /** Phase 3 funnel sign-off, keyed by the page name. */
  funnel?: Record<string, FunnelSlotState>;
  /** Drilon has signed the whole funnel off. */
  funnelApproved?: boolean;
  /** The team's final sign-off once the client has answered on everything. */
  teamApproved?: boolean;
  /** Stops the "everything answered" nudge firing more than once. */
  notifiedDecided?: boolean;
  /** A sign-up step: what the client chose and why. */
  signUp?: { taken?: boolean; answeredAt?: string; reason?: string; using?: string };
};

export function readPayload(task: Pick<TaskRow, "step_payload">): StepPayload {
  const raw = task.step_payload as unknown;
  return raw && typeof raw === "object" ? (raw as StepPayload) : {};
}

/** Phase 1 — Onboarding, step by step. Weeks 1–2. */
export const PHASE_1_STEPS: StepSpec[] = [
  {
    key: "p1-welcome-docs",
    title: "Acknowledge Your Welcome Documents",
    kind: "client",
    owner: "Client",
    welcomeDocs: true,
    instructions:
      "Open each welcome document, read it, then tick to confirm you have read and understood it. Everything else in your portal follows on from here.",
  },
  {
    key: "p1-blueprint",
    title: "Client Blueprint Document",
    kind: "client",
    owner: "Client",
    instructions: "Please fill this document in as much detail as possible.",
    templateLabel: "BGE Client Blueprint Document (Template)",
    templateUrls: {
      dfy: "https://docs.google.com/document/d/1est7PQU3i7TUXYTqv1EarzJ_0h6JJZES/edit?usp=sharing&ouid=107202562071270956668&rtpof=true&sd=true",
      dwy: "https://docs.google.com/document/d/134fAmtLk0NjGVzy5ZQRz-DNB164Dc1FX/edit?usp=sharing&ouid=107202562071270956668&rtpof=true&sd=true",
    },
    templateUrl: null,
    submission: true,
  },
  {
    key: "p1-podia",
    title: "Podia Video Course",
    kind: "client",
    owner: "Client",
    instructions:
      "You only need to watch the first 31 videos, up to and including “What is scale, no really what is it?”. That is roughly 3 hours if you watch at 1.5x speed.",
  },
  {
    key: "p1-onboarding-call",
    title: "Onboarding Call With William",
    kind: "either",
    owner: "Client / William",
    instructions: "Request your onboarding call with William in the WhatsApp group.",
  },
  {
    key: "p1-information-doc",
    title: "Client Information Document",
    kind: "client",
    owner: "Client",
    instructions:
      "Please fill this document in as much detail as possible. Please note this should be completed after your call with William. If you do it before, there may be changes inside that you have to make all over again — so to save repeating the work, wait for the call with William and it will be discussed in there.",
    templateLabel: "BGE Client Information Document (Template)",
    templateUrls: {
      dfy: "https://docs.google.com/document/d/1gMaLnGSaeoL3s7bDcebXTQYSSGDKsRxg/edit?usp=sharing&ouid=107202562071270956668&rtpof=true&sd=true",
      dwy: "https://docs.google.com/document/d/1S3zyQxRLJXQ4R7GwdqPu7AG-Z4pQKfy6/edit?usp=sharing&ouid=107202562071270956668&rtpof=true&sd=true",
    },
    templateUrl: null,
    submission: true,
  },
  {
    key: "p1-copywriting",
    title: "Copywriting",
    kind: "either",
    tiers: ["dfy"],
    ownerFromVslWriter: true,
    instructions:
      "The team has now begun the copywriting process. You will get a notification when they are complete. At that point, you will either approve it, add comments, or send back your own final version.",
    timelineNote: "Expected timeline: 7 days",
    copyDesk: true,
  },
  {
    key: "p1-copy-call-waleed",
    title: "Copywriting Call With Waleed",
    kind: "either",
    tiers: ["dwy"],
    owner: "Client / Waleed",
    instructions:
      "Book your copywriting call with Waleed inside the WhatsApp group. On this call he walks you through how your VSL copy and ads copy get written, and what he needs from you.",
  },
  {
    key: "p1-copy-assist-waleed",
    title: "Copywriting Assistance With Waleed",
    kind: "either",
    tiers: ["dwy"],
    owner: "Waleed",
    instructions:
      "Your VSL copy and ads copy are written with Waleed's assistance. You can write the first version yourself and send it over, or Waleed writes it and you review it. Either way it goes through the same back and forth until it is approved.",
    timelineNote: "Expected timeline: 7 days",
    copyDesk: true,
    copySlots: ["VSL Copy", "Ads Copy"],
  },
  {
    key: "p1-copy-drilon",
    title: "Copywriting Done By Drilon",
    kind: "either",
    tiers: ["dwy"],
    owner: "Drilon",
    instructions:
      "Drilon writes the pre-call, cancellation, no-show and post-call no-close email sequences, the thank you page video copy and the 9 FAQ video copy for you. You will get a notification when they are ready to approve.",
    timelineNote: "Expected timeline: 7 days",
    copyDesk: true,
    copySlots: [
      "TY Page Video Copy",
      "9 FAQ Videos Copy",
      "Pre call email sequence copy",
      "Cancellation email sequence copy",
      "No show email sequence copy",
      "Post call no close email sequence copy",
    ],
  },
];

/** Phase 2 — Funnel Build, step by step. Weeks 2–4. */
export const PHASE_2_STEPS: StepSpec[] = [
  {
    key: "p2-record-assets",
    title: "Video Assets To Be Recorded",
    kind: "either",
    owner: "Client",
    instructions:
      "It is now time for you to start recording the key video assets below. Firstly, read the document below to see what our expectations are in terms of your recordings. From that point, we will check all the videos before you send this to an editor of your choice or our recommended editor.",
    templateLabel: "BGE Recording SOP Sheet",
    templateUrl: null,
    assetDesk: true,
  },
  {
    key: "p2-edit-assets",
    title: "Video Assets To Be Edited",
    kind: "either",
    owner: "Client",
    instructions:
      "Now that you have our approval for the recordings, it's time to get connected with an editor. We can recommend an editor that we have personally used for all other clients or you can choose your own. Please reach out via WhatsApp for more information if needed. Below we have also attached the BGE Video Editing SOP Sheet for you to review with the editor of your choice.",
    templateLabel: "BGE Video Editing SOP Sheet",
    templateUrl: null,
    assetDesk: true,
  },
  {
    key: "p2-amalor",
    title: "Sign Up To Amalor",
    kind: "client",
    owner: "Client",
    tiers: ["dfy"],
    instructions:
      "Amalor is the CRM we build every funnel and onboarding flow in. Sign up below, and the Amalor team will onboard you as a done-for-you client.",
    signUp: {
      field: "amalor",
      product: "Amalor",
      url: null,
      optOutHint:
        "If you do not opt to use Amalor as your CRM, please confirm this with the team inside the WhatsApp chat and complete the details below.",
      warning:
        "Are you aware that, as a done-for-you client, we complete all of your funnels and onboarding only in the Amalor software? If you decide to use your own CRM, we cannot carry this work out and you have to do it yourself.",
    },
  },
  {
    key: "p2-amalor-onboarding",
    title: "Complete Your Onboarding Course With The Amalor Team",
    kind: "either",
    owner: "Client / Amalor team",
    tiers: ["dfy"],
    instructions:
      "The Amalor team will onboard you onto their software. Work through their onboarding course, then tick this off once it is complete.",
  },
  {
    key: "p2-amalor-dwy",
    title: "Sign Up To Amalor",
    kind: "client",
    owner: "Client",
    tiers: ["dwy"],
    instructions:
      "Amalor is the CRM we recommend you build your funnel in. Sign up below. You are also free to use your own CRM — you will just be building the funnel in there yourself.",
    signUp: {
      field: "amalor",
      product: "Amalor",
      url: null,
      optOutHint:
        "If you decide to use your own CRM instead, please confirm this with the team inside the WhatsApp chat and tell us what you are using.",
      warning:
        "Are you aware that all of our templates, frameworks and walkthroughs are built inside Amalor, so using another CRM means rebuilding them yourself?",
    },
  },
  {
    key: "p2-amalor-onboarding-dwy",
    title: "Onboarding Call With The Amalor Team (Optional, Paid)",
    kind: "either",
    owner: "Client / Amalor team",
    tiers: ["dwy"],
    instructions:
      "You can book a paid onboarding call with the Amalor team on their website if you would like to be walked through the software one to one. This is completely optional — you can onboard yourself for free as long as you watch the Amalor videos inside the BGE course, which cover everything you need.",
  },
  {
    key: "p2-commas",
    title: "Sign Up To Commas",
    kind: "client",
    owner: "Client",
    instructions: "Commas is the payment platform we recommend for info businesses.",
    signUp: {
      field: "commas",
      product: "Commas",
      url: null,
      optOutHint:
        "If you decide not to use Commas, please explain the details below and what you currently use.",
      warning:
        "Are you aware that Commas has some of the best features and fee structures to run your info business?",
    },
  },
  {
    key: "p2-crm-build",
    title: "Complete Your Funnel Build Inside Your CRM (e.g. Amalor)",
    kind: "either",
    owner: "Client",
    tiers: ["dwy"],
    instructions:
      "Now build your funnel inside your CRM. Every template, framework and walkthrough you need is inside Amalor and the BGE course — the landing page, the schedule page, the thank you page, the email sequences and the calendar. If you are using your own CRM, use the same frameworks and rebuild them in there. Ask in the WhatsApp group whenever you get stuck, and paste the links to your finished pages below.",
    submission: true,
  },
];

/** Phase 3 — Pre-Launch. Weeks 4–5. */
export const PHASE_3_STEPS: StepSpec[] = [
  {
    key: "p3-ads-account",
    title: "Ads Account Setup",
    kind: "either",
    owner: "Victor",
    instructions:
      "Book a call with Victor inside the WhatsApp group to set your ads account up. You will also be using the ads tracker template, so make sure you download it before your call.",
    templateLabel: "Ads Tracker Template Sheet",
    templateUrls: {
      dfy: "https://docs.google.com/spreadsheets/d/1xgwl2ckyPmeMB89TjY6actI954-HXCNX/edit?usp=sharing&ouid=107202562071270956668&rtpof=true&sd=true",
      dwy: "https://docs.google.com/spreadsheets/d/1zJuL0CvUVDVq3fh8ExHqMh-rpT-xTWKn/edit?usp=sharing&ouid=107202562071270956668&rtpof=true&sd=true",
    },
    templateUrl: "/ads-tracker-template.xlsx",
  },
  {
    key: "p3-sales-process",
    title: "Sales Process Setup",
    kind: "either",
    owner: "Alfie",
    instructions: "Book a call with Alfie inside the WhatsApp group to set your sales process up.",
  },
  {
    key: "p3-content-plan",
    title: "Content Plan Setup",
    kind: "either",
    owner: "Client / Drilon",
    contentPlan: true,
    contentPlanOnly: true,
    instructions:
      "Complete the YouTube competitor analysis template below and send it back. Drilon will then add our feedback, strategy and content plan for you to read.",
  },
  {
    key: "p3-confirm-crm",
    title: "Confirm Where You Built Your Funnel",
    kind: "client",
    owner: "Client",
    tiers: ["dwy"],
    instructions:
      "Tell us where your funnel was built. If it is inside Amalor, write “Amalor” below and Drilon reviews it in the normal way. If it is inside your own CRM, paste the links to your funnel pages below instead — Drilon will then send you one Loom video with his review.",
    submission: true,
  },
  {
    key: "p3-funnel-review",
    title: "Funnel Review Completed",
    kind: "team",
    owner: "Drilon",
    tiers: ["dfy"],
    drilonOnly: true,
    instructions:
      "Final check of everything we have built. Add every finished page below, approve each one, then sign the whole funnel off to start the launch.",
    funnelDesk: true,
  },
  {
    key: "p3-funnel-review-dwy",
    title: "Funnel Review Completed",
    kind: "team",
    owner: "Drilon",
    tiers: ["dwy"],
    drilonOnly: true,
    instructions:
      "Review the funnel the client has built. If it is in Amalor, check each page below and approve it. If it is in their own CRM, paste one Loom video at the top with your review of every page, then approve the whole funnel to start the launch.",
    funnelDesk: true,
    submission: true,
  },
  {
    key: "p3-speakscript",
    title: "Start Using SpeakScript Scale Software",
    kind: "client",
    owner: "Client",
    instructions:
      "SpeakScript Scale is the software we use to script every video asset, so you never sit staring at a blank page. Sign up below, watch the Loom walkthrough, then let us know whether you are using it. If you are not, you will be writing and scripting every video yourself.",
    signUp: {
      field: "sss",
      product: "SpeakScript Scale",
      url: "https://speakscriptscale.com",
      guideUrl: null,
      optOutHint:
        "If you decide not to use SpeakScript Scale, please explain the details below and confirm this with the team inside the WhatsApp chat.",
      warning:
        "Are you aware that SpeakScript Scale is what we use to script and record every asset, and that without it you will be scripting your videos yourself?",
    },
  },
];

/** Phase 4 — Launch. Weeks 5–6. */
export const PHASE_4_STEPS: StepSpec[] = [
  {
    key: "p4-launch",
    title: "Launch The Funnel And Ads",
    kind: "team",
    owner: "Victor",
    instructions:
      "Everything has been signed off. Victor launches the ads and the funnel goes live — nothing further is needed from the client.",
  },
];

/** Phase 5 — Optimisation. Moves along with time once live. */
export const PHASE_5_STEPS: StepSpec[] = [
  {
    key: "p5-funnel-optimised",
    title: "Funnel Optimised",
    kind: "team",
    owner: "Drilon",
    automatic: true,
  },
  {
    key: "p5-calls-reviewed",
    title: "Sales Calls Reviewed",
    kind: "team",
    owner: "Alfie",
    automatic: true,
  },
  { key: "p5-ads-reviewed", title: "Ads Reviewed", kind: "team", owner: "Victor", automatic: true },
];

/** Phase 6 — Scaling. */
export const PHASE_6_STEPS: StepSpec[] = [
  { key: "p6-scaling", title: "Scaling", kind: "team", owner: "Drilon", automatic: true },
];

export const STEPS_BY_PHASE: Record<number, StepSpec[]> = {
  1: PHASE_1_STEPS,
  2: PHASE_2_STEPS,
  3: PHASE_3_STEPS,
  4: PHASE_4_STEPS,
  5: PHASE_5_STEPS,
  6: PHASE_6_STEPS,
};

/** The template a client actually gets, which differs by delivery path. */
export function stepTemplateUrl(
  spec: StepSpec | undefined,
  client: { program?: string | null; roadmap_program?: string | null },
) {
  if (!spec) return null;
  return spec.templateUrls?.[roadmapKind(client)] ?? spec.templateUrl ?? null;
}

export function stepSpec(stepKey: string | null | undefined): StepSpec | undefined {
  if (!stepKey) return undefined;
  return Object.values(STEPS_BY_PHASE)
    .flat()
    .find((step) => step.key === stepKey);
}

/** The pieces of copy that belong to one copywriting step. */
export function copySlotsFor(stepKey: string | null | undefined): readonly string[] {
  return stepSpec(stepKey)?.copySlots ?? COPY_SLOTS;
}

/**
 * The steps of one phase for one delivery path. Done by you follows the Done
 * for you roadmap for now, until its own simpler roadmap is designed.
 */
export function stepsForPhase(phaseId: number, kind: ProgramKind): StepSpec[] {
  const tier: ProgramKind = kind === "dby" ? "dfy" : kind;
  return (STEPS_BY_PHASE[phaseId] ?? []).filter((step) => !step.tiers || step.tiers.includes(tier));
}

/** Copy owner follows the choice made on the client overview. */
export function copyOwner(vslWriter?: string | null) {
  const writer = vslWriter?.includes("Waleed") ? "Waleed" : "William";
  return `${writer} & Drilon`;
}

export function copyWriter(vslWriter?: string | null) {
  return vslWriter?.includes("Waleed") ? "Waleed" : "William";
}

/**
 * A client can only work on the earliest unfinished step. Later steps stay
 * readable but locked; the team is never locked out of anything.
 */
export function stepLocked(task: TaskRow, all: TaskRow[], readOnly: boolean) {
  if (!readOnly || !task.step_key) return false;
  return all.some(
    (other) =>
      other.phase_id === task.phase_id &&
      other.step_key &&
      other.gate_order < task.gate_order &&
      other.status !== "done",
  );
}

/** A client, as far as the roadmap needs to know them. */
export type StepClientLite = {
  id: string;
  vsl_writer?: string | null;
  content_plan?: boolean | null;
  program?: string | null;
  roadmap_program?: string | null;
};

/** Builds the scripted step rows of one phase for one client. */
export function buildPhaseSteps(
  client: StepClientLite,
  phaseId: number,
  start: (index: number) => string | null,
): TaskInsert[] {
  const all = stepsForPhase(phaseId, roadmapKind(client));
  const steps = all.filter((step) => !step.contentPlanOnly || Boolean(client.content_plan));

  return steps.map((step, index) => ({
    client_id: client.id,
    phase_id: phaseId,
    step_key: step.key,
    step_kind: step.kind,
    gate_order: index + 1,
    sort_order: index,
    title: step.title,
    instructions: step.instructions ?? null,
    template_url: step.templateUrl ?? null,
    owner: step.ownerFromVslWriter ? copyOwner(client.vsl_writer) : (step.owner ?? null),
    status: "to_come",
    priority: "medium",
    client_visible: true,
    expected_date: start(index),
  }));
}

/**
 * Puts the scripted steps onto a client that hasn't got them yet, and clears the
 * old auto-generated checklist for those phases so nothing is duplicated.
 */
export function useSyncPhaseSteps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      client,
      existing,
      dates,
    }: {
      client: StepClientLite;
      existing: TaskRow[];
      dates: (phaseId: number) => (index: number) => string | null;
    }) => {
      const phases = Object.keys(STEPS_BY_PHASE).map(Number);
      const wanted = phases.flatMap((phaseId) => buildPhaseSteps(client, phaseId, dates(phaseId)));
      const wantedKeys = new Set(wanted.map((row) => row.step_key));
      const have = new Set(existing.filter((t) => t.step_key).map((t) => t.step_key));
      const rows = wanted.filter((row) => !have.has(row.step_key!));
      if (rows.length) {
        const { error } = await supabase.from("client_tasks").insert(rows as never);
        if (error) throw error;
      }

      // Steps that no longer belong: renamed keys, or the content plan switched off.
      const stale = existing
        .filter((t) => t.step_key && !wantedKeys.has(t.step_key))
        .map((t) => t.id);
      if (stale.length) {
        const { error } = await supabase.from("client_tasks").delete().in("id", stale);
        if (error) throw error;
      }

      // Keep wording, owners, phases and dates on existing rows in step with
      // the script. A date somebody set by hand (date_locked) is left alone.
      for (const row of wanted) {
        const current = existing.find((t) => t.step_key === row.step_key);
        if (!current) continue;
        const wantedDate = current.date_locked
          ? (current.expected_date ?? null)
          : ((row.expected_date as string | null | undefined) ?? null);
        if (
          current.title === row.title &&
          current.instructions === (row.instructions ?? null) &&
          current.owner === (row.owner ?? null) &&
          current.phase_id === row.phase_id &&
          current.gate_order === row.gate_order &&
          current.expected_date === wantedDate
        )
          continue;
        const { error } = await supabase
          .from("client_tasks")
          .update({
            title: row.title,
            instructions: row.instructions ?? null,
            owner: row.owner ?? null,
            phase_id: row.phase_id,
            gate_order: row.gate_order,
            sort_order: row.sort_order,
            expected_date: wantedDate,
          } as never)
          .eq("id", current.id);
        if (error) throw error;
      }

      // Retire the previous auto-seeded checklist (keeps hand-added tasks).
      const legacy = existing
        .filter((t) => phases.includes(t.phase_id) && !t.step_key && t.template_index !== null)
        .map((t) => t.id);
      if (legacy.length) {
        const { error } = await supabase.from("client_tasks").delete().in("id", legacy);
        if (error) throw error;
      }
      return rows.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_tasks"] }),
  });
}

async function notify(
  rows: {
    client_id: string;
    audience: "team" | "client";
    kind: string;
    title: string;
    body?: string | null;
    /** The team member this is really for, so it shows in their own list. */
    owner?: string | null;
  }[],
) {
  const { error } = await supabase.from("notifications").insert(rows as never);
  if (error) console.error("notification failed", error.message);
}

/** The team member whose move a step is waiting on. */
export function stepOwnerName(
  stepKey: string | null | undefined,
  client?: { vsl_writer?: string | null },
) {
  const spec = stepSpec(stepKey);
  if (!spec) return null;
  if (spec.ownerFromVslWriter) return copyWriter(client?.vsl_writer);
  const owner = spec.owner ?? "";
  const named = ["Drilon", "William", "Alfie", "Victor", "Waleed", "Lisa"].find((name) =>
    owner.includes(name),
  );
  return named ?? null;
}

/** Tells the right team member that a step now needs them. */
export async function notifyStepOwner(
  client: { id: string; name: string; vsl_writer?: string | null },
  stepKey: string,
  title: string,
  body?: string,
) {
  const owner = stepOwnerName(stepKey, client);
  if (!owner) return;
  await notify([
    { client_id: client.id, audience: "team", kind: "action", title, body: body ?? null, owner },
  ]);
}

/** Internal ping once the client sends video assets over for review. */
export async function notifyAssetReview(
  client: { id: string; name: string; vsl_writer?: string | null },
  what: string,
) {
  await notify([
    {
      client_id: client.id,
      audience: "team",
      kind: "action",
      title: `${copyWriter(client.vsl_writer)} & Drilon: check ${what} — ${client.name}`,
      body: `/clients/${client.id}`,
      owner: copyWriter(client.vsl_writer),
    },
  ]);
}

/** One ping covering every video the client sent over together. */
export async function notifyAssetsSubmitted(
  client: { id: string; name: string; vsl_writer?: string | null },
  slots: string[],
  step: string,
) {
  await notify([
    {
      client_id: client.id,
      audience: "team",
      kind: "action",
      title: `${copyWriter(client.vsl_writer)}: ${client.name} sent ${slots.join(", ")} for review — ${step}`,
      body: `/clients/${client.id}`,
      owner: copyWriter(client.vsl_writer),
    },
  ]);
}

/** One ping covering every video review we sent back together. */
export async function notifyAssetsReviewed(
  client: { id: string; name: string },
  approved: string[],
  revisions: string[],
) {
  const parts = [
    approved.length ? `Approved: ${approved.join(", ")}` : "",
    revisions.length ? `Changes needed: ${revisions.join(", ")}` : "",
  ].filter(Boolean);
  await notify([
    {
      client_id: client.id,
      audience: "client",
      kind: "action",
      title: "We have reviewed your videos",
      body: parts.join(" · ") || "Open your roadmap to see our notes.",
    },
  ]);
}

/** Sends the revision notes to the client's portal. */
export async function notifyAssetRevision(
  client: { id: string; name: string },
  slot: string,
  note: string,
) {
  await notify([
    {
      client_id: client.id,
      audience: "client",
      kind: "action",
      title: `${slot} needs a revision`,
      body: note,
    },
  ]);
}

/** Internal pings once the client hands over their information document. */
export async function notifyCopywriting(client: {
  id: string;
  name: string;
  vsl_writer?: string | null;
}) {
  const link = `/clients/${client.id}`;
  await notify([
    {
      client_id: client.id,
      audience: "team",
      kind: "action",
      title: `${copyWriter(client.vsl_writer)}: Copy for VSL / Ads — ${client.name}`,
      body: link,
      owner: copyWriter(client.vsl_writer),
    },
    {
      client_id: client.id,
      audience: "team",
      kind: "action",
      title: `Drilon: Copy for TY Page Videos & Email Sequences — ${client.name}`,
      body: link,
      owner: "Drilon",
    },
  ]);
}

/** One notification covering every piece of copy sent together. */
export async function notifyCopySubmitted(
  client: { id: string; name: string },
  slots: string[],
  by: string,
) {
  await notify([
    {
      client_id: client.id,
      audience: "client",
      kind: "action",
      title: `${by} has sent your copy over: ${slots.join(", ")}`,
      body: "Open your roadmap to approve it, add comments, or send back your own final version.",
    },
  ]);
}

/**
 * The client has reviewed a piece of copy. This lands on the person who sent
 * that copy over, so a rewrite or a check is their own task, not the team's.
 */
export async function notifyCopyReviewed(
  client: { id: string; name: string; vsl_writer?: string | null },
  lines: string[],
  sentBy?: string | null,
  decision?: "approved" | "comments" | "edited",
) {
  const owner = teamName(sentBy) ?? copyWriter(client.vsl_writer);
  const what =
    decision === "comments"
      ? "left comments — a rewrite is needed"
      : decision === "edited"
        ? "sent their own final version — check it"
        : decision === "approved"
          ? "approved your copy"
          : "has reviewed copy";
  await notify([
    {
      client_id: client.id,
      audience: "team",
      kind: "action",
      title: `${owner}: ${client.name} ${what}`,
      body: `${lines.join(" · ")} — /clients/${client.id}`,
      owner,
    },
  ]);
}

/** Team-only nudge once the client has answered on every piece of copy. */
export async function notifyCopyDecided(client: { id: string; name: string }) {
  await notify([
    {
      client_id: client.id,
      audience: "team",
      kind: "action",
      title: `Drilon: all copy settled — sign off and move ${client.name} to Funnel Build`,
      body: `/clients/${client.id}`,
      owner: "Drilon",
    },
  ]);
}

/** Whichever of our team a free-text owner field is really pointing at. */
export function teamName(value?: string | null) {
  if (!value) return null;
  return (
    ["Drilon", "William", "Alfie", "Victor", "Waleed", "Lisa"].find((name) =>
      value.includes(name),
    ) ?? null
  );
}

/** A client has handed a completed document back on one of their own steps. */
export async function notifyClientSubmission(
  client: { id: string; name: string; vsl_writer?: string | null },
  tasks: TaskRow[],
  task: TaskRow,
  what: "document" | "note",
) {
  // Whoever owns the next unfinished step in that phase picks this up.
  const next = tasks
    .filter((row) => row.phase_id === task.phase_id && row.step_key && row.status !== "done")
    .sort((a, b) => a.gate_order - b.gate_order)
    .find((row) => row.id !== task.id);
  const owner =
    teamName(task.owner) ??
    (next?.step_key ? stepOwnerName(next.step_key, client) : null) ??
    "Drilon";
  await notify([
    {
      client_id: client.id,
      audience: "team",
      kind: "action",
      title: `${owner}: ${client.name} sent their ${what === "document" ? "completed document" : "notes"} for ${task.title}`,
      body: `/clients/${client.id}`,
      owner,
    },
  ]);
}

/** Drilon's own prompt as soon as a client reaches Pre-Launch. */
export async function notifyFunnelReview(client: { id: string; name: string }) {
  await notify([
    {
      client_id: client.id,
      audience: "team",
      kind: "action",
      title: `Drilon: complete final funnel build review — ${client.name}`,
      body: `Review every page and confirm the funnel is good to launch — /clients/${client.id}`,
      owner: "Drilon",
    },
  ]);
}

/** Victor's prompt once Drilon has signed the funnel off. */
export async function notifyLaunchReady(client: { id: string; name: string }) {
  await notify([
    {
      client_id: client.id,
      audience: "team",
      kind: "action",
      title: `Victor: launch ${client.name}`,
      body: `The funnel has been signed off by Drilon and is ready to go live — /clients/${client.id}`,
      owner: "Victor",
    },
    {
      client_id: client.id,
      audience: "client",
      kind: "info",
      title: "Your funnel has passed its final review",
      body: "We are launching it now — nothing further is needed from you.",
    },
  ]);
}

/**
 * How far a client has actually got: their recorded stage, or further if every
 * task in a stage is finished. Keeps the next stage from staying locked.
 */
export function reachedPhase(phase: number, tasks: TaskRow[]) {
  let reached = phase || 1;
  for (let id = 1; id <= 6; id += 1) {
    const list = tasks.filter((task) => task.phase_id === id);
    if (list.length && list.every((task) => task.status === "done")) {
      reached = Math.max(reached, id + 1);
    }
  }
  return Math.min(reached, 6);
}

/** The day the funnel went live, taken from the launch step. */
export function launchDate(tasks: TaskRow[]) {
  const launch = tasks.find((task) => task.step_key === "p4-launch" && task.status === "done");
  return launch?.actual_date ?? null;
}

/**
 * After launch there is nothing left to tick — Optimisation and Scaling arrive
 * on their own, two and six weeks after the funnel went live.
 */
export function timedPhase(reached: number, tasks: TaskRow[]) {
  const live = launchDate(tasks);
  if (!live) return reached;
  const weeks = (Date.now() - new Date(`${live}T00:00:00`).getTime()) / (7 * 86400000);
  if (weeks >= 6) return Math.max(reached, 6);
  if (weeks >= 2) return Math.max(reached, 5);
  return reached;
}
