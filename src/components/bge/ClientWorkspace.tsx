import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarClock,
  ChevronDown,
  Clapperboard,
  GaugeCircle,
  ChevronUp,
  LineChart,
  Link2,
  ListChecks,
  MessageSquareText,
  Eye,
  Phone,
  Target,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/bge/AppShell";
import { JourneyTimeline } from "@/components/bge/JourneyTimeline";
import { ApprovalPanel, PortalAccessPanel, RequestsPanel } from "@/components/bge/JourneyPanels";
import { OverviewPanel } from "@/components/bge/OverviewPanel";
import { KeyLinksPanel } from "@/components/bge/KeyLinksPanel";
import { TasksPanel } from "@/components/bge/TasksPanel";
import { TimelinePanel } from "@/components/bge/TimelinePanel";
import { CallsPanel } from "@/components/bge/CallsPanel";
import { StrategyBoard } from "@/components/bge/StrategyBoard";
import { AdsPanel } from "@/components/bge/AdsPanel";
import { ContentPlanPanel } from "@/components/bge/ContentPlanPanel";
import { RenewalPanel } from "@/components/bge/RenewalPanel";
import { ShowMore } from "@/components/bge/ShowMore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Client, type PhaseRow } from "@/lib/bge";
import { daysTo, formatDate } from "@/lib/journey";
import { useTodos, type SyncStatus } from "@/lib/queries";

type TabKey =
  | "overview"
  | "tasks"
  | "timeline"
  | "links"
  | "strategy"
  | "ads"
  | "content"
  | "access"
  | "calls"
  | "renewal";

const TABS: { key: TabKey; label: string; icon: typeof UserRound }[] = [
  { key: "overview", label: "Overview", icon: UserRound },
  { key: "tasks", label: "Outstanding tasks", icon: ListChecks },
  { key: "timeline", label: "Timeline", icon: GaugeCircle },
  { key: "links", label: "Key links & documents", icon: Link2 },
  { key: "strategy", label: "Strategy", icon: Target },
  { key: "ads", label: "Ad performance", icon: LineChart },
  { key: "content", label: "Content plan", icon: Clapperboard },
  { key: "access", label: "Access & decisions", icon: MessageSquareText },
  { key: "calls", label: "Client & team calls", icon: Phone },
  { key: "renewal", label: "Renewal", icon: CalendarClock },
];

/** Tasks anyone assigned about this client from the dashboard to-do list. */
function AssignedTasks({ clientId }: { clientId: string }) {
  const { data: todos = [] } = useTodos();
  const rows = useMemo(
    () =>
      todos
        .filter((todo) => todo.client_id === clientId && !todo.done)
        .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999")),
    [todos, clientId],
  );

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Assigned about this client
      </p>
      {rows.length ? (
        <ShowMore
          items={rows}
          limit={3}
          noun="more"
          render={(todo) => {
            const late = todo.due_date && (daysTo(todo.due_date) ?? 1) < 0;
            return (
              <div
                key={todo.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2.5 hover:bg-accent/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{todo.text}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {todo.owner || "Unassigned"}
                    {todo.issued_by ? ` · set by ${todo.issued_by}` : ""}
                    {todo.source === "client" ? " · client set the task" : ""}
                  </span>
                </span>
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  {todo.priority}
                </span>
                <span
                  className={cn("num text-xs text-muted-foreground", late && "text-destructive")}
                >
                  {formatDate(todo.due_date)}
                </span>
              </div>
            );
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Nothing assigned from the to-do list.</p>
      )}
    </div>
  );
}

function TabBody({
  tab,
  client,
  phases,
  clientView = false,
  focusTask,
}: {
  tab: TabKey;
  client: Client;
  phases: PhaseRow[];
  clientView?: boolean;
  focusTask?: string | null | undefined;
}) {
  switch (tab) {
    case "overview":
      return <OverviewPanel client={client} />;
    case "tasks":
      return (
        <div className="space-y-6">
          <TasksPanel client={client} phases={phases} focusTask={focusTask} />
          <AssignedTasks clientId={client.id} />
        </div>
      );
    case "timeline":
      return <TimelinePanel client={client} phases={phases} clientView={clientView} />;
    case "links":
      return <KeyLinksPanel client={client} clientView={clientView} />;
    case "strategy":
      return <StrategyBoard client={client} clientView={clientView} />;
    case "ads":
      return <AdsPanel client={client} clientView={clientView} />;
    case "content":
      return <ContentPlanPanel client={client} clientView={clientView} />;
    case "access":
      return (
        <div className="space-y-6">
          <p className="text-[12px] text-muted-foreground">
            A record of the decisions and access on this journey. The client can read it; only the
            team changes it.
          </p>
          <PortalAccessPanel client={client} />
          <ApprovalPanel client={client} />
          <RequestsPanel client={client} />
        </div>
      );
    case "calls":
      return <CallsPanel client={client} clientView={clientView} />;
    case "renewal":
      return <RenewalPanel client={client} />;
  }
}

/** Tabs a client is allowed to open in their own portal. */
const CLIENT_TABS: TabKey[] = ["tasks", "timeline", "links", "strategy", "ads", "content", "calls"];

export function DetailsPanel({
  client,
  phases,
  clientView = false,
  openTab,
  focusTask,
}: {
  client: Client;
  phases: PhaseRow[];
  clientView?: boolean;
  openTab?: string | null | undefined;
  focusTask?: string | null | undefined;
}) {
  // The content plan only exists for a client once the team switch it on.
  const contentPlanOn = Boolean(
    (client as Client & { content_plan?: boolean | null }).content_plan,
  );
  const tabs = clientView
    ? TABS.filter((item) => CLIENT_TABS.includes(item.key)).filter(
        (item) => item.key !== "content" || contentPlanOn,
      )
    : TABS;
  const deepLinked = tabs.find((item) => item.key === openTab)?.key;
  const [open, setOpen] = useState(Boolean(deepLinked));
  const [tab, setTab] = useState<TabKey>(deepLinked ?? (clientView ? "tasks" : "overview"));

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-x border-t border-border bg-card shadow-pop transition-[max-height] duration-500 ease-out motion-reduce:transition-none lg:left-14",
        open ? "max-h-[68dvh] rounded-t-xl lg:max-h-[78vh]" : "max-h-[3.25rem]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-primary shadow-ember" />
      <div className="flex h-[3.25rem] flex-nowrap items-center gap-2 overflow-hidden px-3 lg:px-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "h-8 shrink-0 gap-1.5 px-2 text-[11px] font-bold uppercase tracking-widest text-primary transition-all hover:bg-primary/10 hover:text-primary hover:shadow-ember",
            open && "bg-primary/10 shadow-ember",
          )}
        >
          {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />} Details
        </Button>
        <div className="flex flex-1 gap-2 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setTab(key);
                setOpen(true);
              }}
              className={cn(
                "h-8 shrink-0 gap-1.5 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-primary",
                tab === key && open ? "bg-muted text-primary shadow-none" : "text-muted-foreground",
              )}
            >
              <Icon className="size-3.5" /> {label}
            </Button>
          ))}
        </div>
      </div>
      <div
        className={cn(
          "overflow-hidden border-t border-border transition-[max-height,opacity] duration-500 ease-out motion-reduce:transition-none",
          open
            ? "max-h-[calc(68dvh-3.25rem)] opacity-100 lg:max-h-[calc(78vh-3.25rem)]"
            : "max-h-0 border-transparent opacity-0",
        )}
      >
        <div className="h-[calc(68dvh-3.25rem)] overflow-y-auto px-3 py-4 sm:px-4 sm:py-5 lg:h-[calc(78vh-3.25rem)] lg:px-8">
          <TabBody
            tab={tab}
            client={client}
            phases={phases}
            clientView={clientView}
            focusTask={focusTask}
          />
        </div>
      </div>
    </div>
  );
}

export function ClientWorkspace({
  client,
  phases,
  sync,
  openTab,
  focusTask,
}: {
  client: Client;
  phases: PhaseRow[];
  sync: SyncStatus;
  openTab?: string | null | undefined;
  focusTask?: string | null | undefined;
}) {
  const [viewAsClient, setViewAsClient] = useState(false);

  return (
    <AppShell title={client.name} subtitle="Client whiteboard" sync={sync} compactHeader>
      <div className="min-h-screen bg-card">
        <div className="relative pb-14">
          <Link
            to="/clients/$clientId/portal"
            params={{ clientId: client.id }}
            search={{ step: undefined }}
            className="absolute right-4 top-3 z-30 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary shadow-pop hover:bg-primary/10"
          >
            <Eye className="size-3.5" /> Open their whole portal
          </Link>
          {viewAsClient ? (
            <div>
              <JourneyTimeline
                client={client}
                phases={phases}
                readOnly
                teamWorkspace
                viewAsClient
                onToggleClientView={() => setViewAsClient(false)}
              />
              <DetailsPanel
                client={client}
                phases={phases}
                clientView
                openTab={openTab}
                focusTask={focusTask}
              />
            </div>
          ) : (
            <>
              <JourneyTimeline
                client={client}
                phases={phases}
                teamWorkspace
                onToggleClientView={() => setViewAsClient(true)}
              />
              <DetailsPanel
                client={client}
                phases={phases}
                openTab={openTab}
                focusTask={focusTask}
              />
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
