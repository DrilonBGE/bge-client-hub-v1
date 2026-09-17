import { useState } from "react";
import {
  Bell,
  CalendarClock,
  ExternalLink,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  Lock,
  LogOut,
  Map as MapIcon,
  Menu,
  MessageSquareText,
  PlayCircle,
  Settings as SettingsIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PHASE_COLOURS, type Client, type PhaseRow } from "@/lib/bge";
import { daysTo, formatDate, statusMeta, today } from "@/lib/journey";
import { useDelays, useTaskMutations, useTasks, useUploads } from "@/lib/journey-queries";
import { BgeMark } from "@/components/bge/AppShell";
import { JourneyTimeline } from "@/components/bge/JourneyTimeline";
import { DetailsPanel } from "@/components/bge/ClientWorkspace";
import { LinkList } from "@/components/bge/FoundationPanel";
import { GroupCallsPanel } from "@/components/bge/GroupCallsPanel";
import { NotificationBell } from "@/components/bge/NotificationBell";
import { EmptyState, ProgressBar, SectionCard } from "@/components/bge/atoms";
import { phaseWindow, startDate as journeyStart } from "@/lib/task-templates";

import { PORTAL_TABS, type PortalTabKey } from "@/lib/portal-tabs";
import { useClientAccess, visibleTabs } from "@/lib/course";
import { useClientOnboarding } from "@/lib/portal-onboarding";
import { PortalOnboarding } from "@/components/bge/PortalOnboarding";
import { ThemeToggle } from "@/components/bge/ThemeToggle";
import { useNotifications } from "@/lib/journey-queries";
import { useTeamLinks } from "@/lib/queries";
import { KeyLinksPanel } from "@/components/bge/KeyLinksPanel";

export { PORTAL_TABS, type PortalTabKey };

const RECORDINGS_FOLDER_URL =
  "https://drive.google.com/drive/folders/1Ubt3qrzGpOJhLGXRqyBu5mkx2VEgT6L_?usp=sharing";

/** A picture next to every section so the menu is not a wall of words. */
const TAB_ICONS: Record<PortalTabKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  roadmap: MapIcon,
  calls: CalendarClock,
  docs: Link2,
  requests: LifeBuoy,
  settings: SettingsIcon,
};

/**
 * The glowing marker a brand new client sees until the team verify them.
 * Hovering explains that they only have part of the portal for now.
 */
function PreVerificationBadge() {
  return (
    <span
      title="You have partial access until your team verify your account."
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/60 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-[0_0_14px_rgba(232,56,26,0.45)]"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/70" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
      Pre-verification access
    </span>
  );
}

/**
 * The client's own portal, exactly as they see it. The team opens the same
 * thing read-through from a client page, so there is only ever one version.
 */
export function ClientPortalView({
  client,
  phases,
  preview = false,
  onSignOut,
  banner,
}: {
  client: Client;
  phases: PhaseRow[] | undefined;
  /** Team member looking at it — no sign out, no notification bell. */
  preview?: boolean;
  onSignOut?: () => void;
  banner?: React.ReactNode;
}) {
  const [tab, setTab] = useState<PortalTabKey>("dashboard");
  const [navOpen, setNavOpen] = useState(true);
  const [roadmapDetailsTab, setRoadmapDetailsTab] = useState<string | null>(null);
  const roadmapPage = tab === "roadmap";

  const openTab = (key: PortalTabKey) => {
    setTab(key);
    setNavOpen(key !== "roadmap");
  };

  const { data: access } = useClientAccess(client.id);
  const { data: onboarding, isLoading: onboardingLoading } = useClientOnboarding(client.id);
  const portalStatus = (client as { portal_status?: string | null }).portal_status;
  // Until the team verify the account, only the dashboard and settings are available.
  const preVerified = portalStatus !== "verified";
  const denied = portalStatus === "denied";
  const open = visibleTabs(access);
  const allowedTabs = open.filter(
    (key) => !preVerified || key === "dashboard" || key === "settings",
  );
  const tabs = PORTAL_TABS.filter(([key]) => open.includes(key));
  const activeTab = allowedTabs.includes(tab) ? tab : "dashboard";

  const needsWelcomeDocs = !onboardingLoading && !onboarding?.completed_at;

  return (
    <div className="min-h-screen bg-background">
      {banner}
      <header className="sticky top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-2 border-b border-border bg-card px-3 py-3 sm:flex sm:gap-3 sm:px-4">
        <button
          onClick={() => setNavOpen((value) => !value)}
          className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:block"
          aria-label={navOpen ? "Shrink the menu" : "Show the full menu"}
        >
          <Menu className="size-4" />
        </button>
        <BgeMark />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{client.name}</h1>
          <p className="truncate text-[11px] text-muted-foreground">
            Your live launch roadmap with Build, Grow &amp; Exit
          </p>
        </div>
        {preVerified && (
          <span className="hidden sm:inline-flex">
            <PreVerificationBadge />
          </span>
        )}
        <ThemeToggle />
        {!preview && <NotificationBell audience="client" />}
        {!preview && onSignOut && (
          <button
            onClick={onSignOut}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        )}
      </header>

      <div className="flex min-w-0 flex-col lg:flex-row">
        {/* Never fully hidden — on the roadmap it shrinks to just the icons. */}
        <nav
          className={cn(
            "sticky top-[3.75rem] hidden h-[calc(100vh-3.75rem)] shrink-0 flex-col gap-1 border-r border-border bg-card p-2 transition-[width] duration-300 lg:flex",
            navOpen ? "w-52 p-3" : "w-14 items-center",
          )}
        >
          {tabs.map(([key, label]) => {
            const locked = !allowedTabs.includes(key);
            const Icon = TAB_ICONS[key];
            return (
              <button
                key={key}
                onClick={() => !locked && openTab(key)}
                disabled={locked}
                title={locked ? "Locked until your team verify your account" : label}
                className={cn(
                  "flex items-center gap-2 rounded-md text-left text-[13px] font-medium transition-colors",
                  navOpen ? "justify-between px-3 py-2" : "size-10 justify-center",
                  key === "settings" && "mt-auto",
                  locked
                    ? "cursor-not-allowed text-muted-foreground/50"
                    : activeTab === key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {navOpen ? (
                  <>
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </span>
                    {locked && <Lock className="size-3" />}
                  </>
                ) : locked ? (
                  <Lock className="size-4" />
                ) : (
                  <Icon className="size-4" />
                )}
              </button>
            );
          })}
        </nav>

        <nav className="sticky top-[3.75rem] z-20 flex w-full min-w-0 gap-1 overflow-x-auto border-b border-border bg-card px-3 lg:hidden">
          {tabs.map(([key, label]) => {
            const locked = !allowedTabs.includes(key);
            const Icon = TAB_ICONS[key];
            return (
              <button
                key={key}
                onClick={() => !locked && openTab(key)}
                disabled={locked}
                className={cn(
                  "inline-flex items-center gap-1 whitespace-nowrap border-b-2 px-2.5 py-2 text-[13px] font-medium",
                  locked
                    ? "cursor-not-allowed border-transparent text-muted-foreground/50"
                    : activeTab === key
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
                {locked && <Lock className="size-3" />}
              </button>
            );
          })}
        </nav>

        <main
          className={cn(
            "min-w-0 flex-1",
            roadmapPage ? "pb-24" : "space-y-3 p-3 pb-24 sm:space-y-4 sm:p-4",
          )}
        >
          {activeTab === "dashboard" && (
            <>
              {preVerified && (
                <div className="rounded-2xl border border-primary/50 bg-primary/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
                    </span>
                    Pre-verification access
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Manual verification is pending from one of the BGE executive team members. This
                    process should not take longer than 12 hours.
                  </p>
                </div>
              )}
              {needsWelcomeDocs && !denied && (
                <SectionCard title="Your onboarding first steps">
                  <p className="text-[13px] text-muted-foreground">
                    Read and confirm each document below. This is the first step on your roadmap.
                  </p>
                  <div className="mt-3">
                    <PortalOnboarding
                      client={client}
                      preview={preview}
                      embedded
                      onDone={() => (preVerified ? undefined : openTab("roadmap"))}
                    />
                  </div>
                </SectionCard>
              )}
              {preVerified ? (
                <SectionCard title="The rest of your portal">
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-[13px] text-muted-foreground">
                    <Lock className="mt-0.5 size-4 shrink-0" />
                    <p>
                      {denied
                        ? "This portal account has not been approved. Please contact your BGE account manager if you believe this is a mistake."
                        : "Your roadmap, weekly group calls and key links unlock the moment your team verify your account. Nothing else to do for now."}
                    </p>
                  </div>
                </SectionCard>
              ) : (
                <>
                  <RecentNotices clientId={client.id} />
                  {phases && <YouAreHere client={client} phases={phases} />}
                  <TaskSplit
                    clientId={client.id}
                    phases={phases ?? []}
                    contentPlan={Boolean(
                      (client as Client & { content_plan?: boolean | null }).content_plan,
                    )}
                  />
                </>
              )}
            </>
          )}
          {activeTab === "roadmap" && phases && (
            <RoadmapPage client={client} phases={phases} openTab={roadmapDetailsTab} />
          )}
          {activeTab === "calls" && <CallsPage />}
          {activeTab === "docs" && (
            <Docs
              client={client}
              onOpenRoadmapLinks={() => {
                setRoadmapDetailsTab("links");
                openTab("roadmap");
              }}
            />
          )}
          {activeTab === "requests" && <Requests />}
          {activeTab === "settings" && (
            <SectionCard title="Settings">
              <p className="text-sm text-muted-foreground">
                You are signed in as {client.portal_email ?? "your portal email"}.
              </p>
              {!preview && onSignOut && (
                <Button className="mt-3" size="sm" variant="outline" onClick={onSignOut}>
                  <LogOut className="size-3.5" /> Sign out
                </Button>
              )}
            </SectionCard>
          )}
        </main>
      </div>
    </div>
  );
}

/** The very first thing a client sees: anything new since they last looked. */
function RecentNotices({ clientId }: { clientId: string }) {
  // Only ever the client's own notices — never anything about other clients.
  const { data: items } = useNotifications("client");
  const recent = (items ?? []).filter((n) => !n.client_id || n.client_id === clientId).slice(0, 5);

  return (
    <SectionCard title="Recent notifications">
      {recent.length === 0 ? (
        <EmptyState>Nothing new — we will tell you the moment something needs you.</EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {recent.map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-2 rounded-md border border-border px-2.5 py-2 text-[13px]"
            >
              <Bell className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{n.title}</span>
                {n.body && (
                  <span className="block text-[12px] text-muted-foreground">{n.body}</span>
                )}
              </span>
              <span className="num text-[11px] text-muted-foreground">
                {formatDate(n.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
      style={{ color: meta.colour }}
    >
      {meta.label}
    </span>
  );
}

/** The roadmap as its own full page: just the whiteboard and the details drawer. */
function RoadmapPage({
  client,
  phases,
  openTab,
}: {
  client: Client;
  phases: PhaseRow[];
  openTab?: string | null;
}) {
  return (
    <div className="relative">
      <JourneyTimeline client={client} phases={phases} readOnly />
      <DetailsPanel client={client} phases={phases} clientView openTab={openTab} />
    </div>
  );
}

/** Which phase they are in and what happens next. */
function YouAreHere({ client, phases }: { client: Client; phases: PhaseRow[] }) {
  const { data: tasks } = useTasks(client.id);
  const { data: delays } = useDelays(client.id);

  const allTasks = tasks ?? [];
  const next = allTasks.find((t) => t.status !== "done");
  const totalDelay = (delays ?? []).reduce((sum, d) => sum + d.days, 0);
  const done = allTasks.filter((t) => t.status === "done").length;
  const pct = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0;
  const inFlight = allTasks.find((t) => t.owner !== "Client" && t.status === "in_progress");
  const onTrack =
    totalDelay === 0 &&
    !allTasks.some((t) => (daysTo(t.expected_date) ?? 1) < 0 && t.status !== "done");
  const phaseName = phases.find((p) => p.phase_id === client.phase)?.name ?? "Getting started";
  const started = journeyStart(client).toISOString().slice(0, 10);
  const launchIso = phaseWindow(client, 4).toIso;
  const shiftBack = (iso: string) => {
    const date = new Date(`${iso}T00:00:00`);
    date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
  };
  const phaseEndIso = shiftBack(phaseWindow(client, client.phase).toIso);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="ember-rule h-px w-full" />
      <div className="p-3 sm:p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              You are here
            </p>
            <h2 className="mt-1 text-xl font-semibold sm:text-2xl">
              Phase {client.phase} · {phaseName}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {inFlight
                ? `Right now: ${inFlight.title} — ${inFlight.owner ?? "our team"} is on it.`
                : "Right now: nothing is mid-flight, we are lining up the next step."}
            </p>
          </div>
          <span
            className={cn(
              "max-w-28 rounded-full px-2 py-1 text-center text-[10px] font-bold uppercase sm:max-w-none sm:px-3 sm:text-[11px]",
              onTrack ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
            )}
          >
            {onTrack
              ? "On track"
              : `Running ${totalDelay || "a little"} day${totalDelay === 1 ? "" : "s"} behind`}
          </span>
        </div>

        <div className="mt-4">
          <ProgressBar pct={pct} phase={client.phase} />
          <p className="num mt-1.5 text-[12px] text-muted-foreground">
            {done} of {allTasks.length} steps complete · {pct}%
          </p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            { label: "Started", value: formatDate(started) },
            { label: "Anticipated launch", value: formatDate(launchIso) },
            { label: "This phase runs until", value: formatDate(phaseEndIso) },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="num mt-1 text-[13px] font-medium">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-border p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Next step
          </p>
          <p className="mt-1 text-[13px] font-medium">{next?.title ?? "Nothing outstanding"}</p>
          {next && (
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {next.owner === "Client"
                ? "Over to you"
                : `${next.owner ?? "Our team"} is doing this`}
            </p>
          )}

          {next && (
            <div className="mt-1.5">
              <StatusPill status={next.status} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

type PortalTask = ReturnType<typeof useTasks>["data"] extends (infer T)[] | undefined ? T : never;

/** Groups a list of steps into phase order, keeping each phase's own colour. */
function byPhase(tasks: PortalTask[], phases: PhaseRow[]) {
  const ids = Array.from(new Set(tasks.map((t) => t.phase_id))).sort((a, b) => a - b);
  return ids.map((id) => ({
    id,
    name: phases.find((p) => p.phase_id === id)?.name ?? `Phase ${id}`,
    colour: PHASE_COLOURS[id] ?? "var(--primary)",
    tasks: tasks.filter((t) => t.phase_id === id),
  }));
}

/** One phase's worth of steps, inside its own tinted card. */
function PhaseGroup({
  group,
  children,
}: {
  group: { id: number; name: string; colour: string };
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{
        borderColor: group.colour,
        background: `color-mix(in srgb, ${group.colour} 8%, transparent)`,
      }}
    >
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
        <span className="size-2 rounded-full" style={{ background: group.colour }} />
        <span style={{ color: group.colour }}>
          Phase {group.id} · {group.name}
        </span>
      </p>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

/** Your tasks and BGE's tasks side by side, split into phases. */
function TaskSplit({
  clientId,
  contentPlan,
  phases = [],
}: {
  clientId: string;
  contentPlan: boolean;
  phases?: PhaseRow[];
}) {
  const { data: tasks } = useTasks(clientId);
  const { update } = useTaskMutations();
  // The content plan only exists for a client once we have switched it on.
  const all = (tasks ?? []).filter((t) => contentPlan || t.step_key !== "p3-content-plan");
  const yours = byPhase(
    all.filter((t) => t.owner === "Client"),
    phases,
  );
  const ours = byPhase(
    all.filter((t) => t.owner !== "Client" && t.status !== "done"),
    phases,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Your Tasks">
        {yours.length === 0 ? (
          <EmptyState>Nothing on your plate right now.</EmptyState>
        ) : (
          <div className="space-y-3">
            {yours.map((group) => (
              <PhaseGroup key={group.id} group={group}>
                {group.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-[13px]"
                  >
                    <input
                      type="checkbox"
                      checked={task.status === "done"}
                      onChange={(e) =>
                        update.mutate({
                          id: task.id,
                          patch: e.target.checked
                            ? { status: "done", actual_date: today() }
                            : { status: "waiting_client", actual_date: null },
                        })
                      }
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1",
                        task.status === "done" && "line-through opacity-60",
                      )}
                    >
                      {task.title}
                      {task.detail && (
                        <span className="block text-[12px] text-muted-foreground">
                          {task.detail}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </PhaseGroup>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="BGE Tasks">
        {ours.length === 0 ? (
          <EmptyState>Nothing open on our side right now.</EmptyState>
        ) : (
          <div className="space-y-3">
            {ours.map((group) => (
              <PhaseGroup key={group.id} group={group}>
                {group.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-[13px]"
                  >
                    <span className="min-w-0 flex-1">{task.title}</span>
                    <StatusPill status={task.status} />
                  </div>
                ))}
              </PhaseGroup>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function Docs({ client, onOpenRoadmapLinks }: { client: Client; onOpenRoadmapLinks: () => void }) {
  const { data: uploads } = useUploads(client.id);

  return (
    <div className="space-y-4">
      <KeyLinksPanel client={client} clientView readOnly hideEmpty showSubmitter />

      <SectionCard title="Your documents">
        {(uploads ?? []).length === 0 ? (
          <EmptyState>Nothing here yet.</EmptyState>
        ) : (
          <ul className="space-y-1.5">
            {(uploads ?? []).map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-[13px]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{u.label}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {u.by_client ? "You submitted it" : "BGE submitted it"}
                  </span>
                </span>
                <a
                  href={u.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Open <ExternalLink className="size-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <p className="px-1 text-[11px] text-muted-foreground">
        Need to send us a link? Open your Client Roadmap and use the{" "}
        <button
          type="button"
          onClick={onOpenRoadmapLinks}
          className="font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Key Links &amp; Documents section
        </button>
        .
      </p>
    </div>
  );
}

/** The order we want clients to try before they ask a person. */
function SupportSteps() {
  const { data: links } = useTeamLinks();
  const brain =
    (links ?? []).find((l) => /brain/i.test(l.name ?? ""))?.link ?? "https://willsbrain.ai";

  return (
    <SectionCard title="How to Get Help">
      <ol className="space-y-3">
        <li className="rounded-xl border border-border p-3">
          <p className="text-[13px] font-semibold">1. Ask Will&apos;s Brain AI any question</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            This is literally all of William&apos;s knowledge extracted into an AI. Any questions
            you have, ask this first.
          </p>
          <Button asChild size="sm" className="mt-2">
            <a href={brain} target="_blank" rel="noreferrer">
              Open Will&apos;s Brain AI <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </li>
        <li className="rounded-xl border border-border p-3">
          <p className="text-[13px] font-semibold">2. Ask us in your WhatsApp chat</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            If Will&apos;s Brain AI doesn&apos;t answer your question, ask us inside your WhatsApp
            group.
          </p>
        </li>
      </ol>
      <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground/80">
        Have any technical issues with this client portal?{" "}
        <a
          href="mailto:drilon11@hotmail.co.uk"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Email us at drilon11@hotmail.co.uk
        </a>
        .
      </p>
    </SectionCard>
  );
}

function Requests() {
  return <SupportSteps />;
}

/** The three sections that live inside the Weekly Group Calls tab. */
function CallsPage() {
  const [section, setSection] = useState<"upcoming" | "recordings" | "suggestions">("upcoming");

  const tabs = [
    { key: "upcoming", label: "Upcoming calls", icon: CalendarClock },
    { key: "recordings", label: "Recordings", icon: PlayCircle },
    { key: "suggestions", label: "Call suggestions", icon: MessageSquareText },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              section === key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {section === "upcoming" && <GroupCallsPanel />}

      {section === "recordings" && (
        <SectionCard title="Watch all previous group call recordings">
          <p className="text-[13px] text-muted-foreground">
            Every past group call recording is kept in this Drive folder.
          </p>
          <Button asChild size="sm" className="mt-3">
            <a href={RECORDINGS_FOLDER_URL} target="_blank" rel="noreferrer">
              Open recordings folder <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </SectionCard>
      )}

      {section === "suggestions" && (
        <SectionCard title="Group call suggestions">
          <div className="space-y-3 text-[13px] leading-relaxed text-muted-foreground">
            <p>
              There may be quite a few people on the call, so please respect other people&apos;s
              time and don&apos;t bring along a long list of questions that may take too long to
              cover. These calls are absolutely here to help you, but they&apos;re here to help
              everyone as a whole.
            </p>
            <p>
              Feel free to attend and simply listen in! You don&apos;t always have to bring
              questions. Sometimes it&apos;s nice to just learn from other people&apos;s
              achievements, questions, progress, and to watch their problems get solved live.
            </p>
            <p>
              Try to bring clear questions or problems to be solved. The more broad you are, the
              harder it is to create clarity and solve the root-problem so that you can have a
              breakthrough and get back to building, creating and progressing in your business.
            </p>
            <p>
              A great way to bring up a problem can be like this: &quot;Hey Will, I&apos;m stuck on
              [problem]. I think it&apos;s happening because [explain]. What would you do to solve
              this?&quot;. Or even: &quot;Hey Will, my current bottleneck is [bottleneck]. How would
              you solve this?&quot;
            </p>
            <p>
              Want to have the ability to book in private &apos;anytime&apos; one-to-one Zoom calls
              with Will, plus get his personal WhatsApp number too, so that he can personally
              support you as you build and grow your business? Upgrade to the &apos;Done With
              You&apos; program by sending us a message or reaching out to the account manager who
              brought you into the program.
            </p>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
