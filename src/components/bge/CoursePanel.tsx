import { useMemo, useState } from "react";
import { CalendarCheck, ChevronDown, ExternalLink, PlayCircle, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ProgressBar, SectionCard } from "@/components/bge/atoms";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/bge";
import { programKind } from "@/lib/journey-steps";
import {
  VIDEOS_BEFORE_WILLIAM_CALL,
  allowed,
  toggleMap,
  useClientAccess,
  useCourse,
  useCourseMutations,
  useCourseProgress,
  useCourseProgressMutations,
  type CourseItem,
} from "@/lib/course";

/**
 * The BGE course content: categories, modules and the videos or files inside
 * them. Clients tick items off; the team can paste links and change a video
 * into a file when the item turns out to be a document.
 */
export function CoursePanel({ client, editable = false }: { client?: Client; editable?: boolean }) {
  const { data: tree = [], isLoading } = useCourse();
  const { data: access } = useClientAccess(client?.id);
  const { data: progress = [] } = useCourseProgress(client?.id);
  const { toggle } = useCourseProgressMutations(client?.id);
  const [open, setOpen] = useState<string | null>(null);

  const doneIds = useMemo(() => new Set(progress.map((row) => row.item_id)), [progress]);
  const courseAccess = toggleMap(access?.course);
  const sections = tree.filter((section) => allowed(courseAccess, section.id));

  const items = sections.flatMap((section) =>
    section.modules.filter((module) => allowed(courseAccess, module.id)).flatMap((m) => m.items),
  );
  const videos = items.filter((item) => item.kind === "video");
  const videosDone = videos.filter((item) => doneIds.has(item.id)).length;
  const total = items.length;
  const done = items.filter((item) => doneIds.has(item.id)).length;
  const kind = programKind(client?.program);
  const needsWilliam = Boolean(client) && (kind === "dfy" || kind === "dwy");

  if (isLoading) return <SectionCard title="BGE course content">Loading…</SectionCard>;
  if (!sections.length)
    return (
      <SectionCard title="BGE course content">
        <EmptyState>Your course content will appear here shortly.</EmptyState>
      </SectionCard>
    );

  return (
    <div className="space-y-4">
      <SectionCard title="BGE course content">
        <p className="text-[12px] text-muted-foreground">
          {editable && !client
            ? "Paste the link under each item. Anything without a link shows as coming soon."
            : "Tick each video or document off as you finish it. Your progress is saved automatically."}
        </p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium">
              {done} of {total} finished
            </span>
            <span className="num text-muted-foreground">
              {videosDone} videos watched
              {needsWilliam ? ` of ${VIDEOS_BEFORE_WILLIAM_CALL} needed` : ""}
            </span>
          </div>
          <ProgressBar
            pct={total ? Math.round((done / total) * 100) : 0}
            phase={client?.phase ?? 1}
          />
        </div>
      </SectionCard>

      {needsWilliam && videosDone >= VIDEOS_BEFORE_WILLIAM_CALL && (
        <div className="flex items-start gap-3 rounded-lg border border-primary bg-primary/10 p-4">
          <CalendarCheck className="mt-0.5 size-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-primary">
              You have finished the course content you need
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              That is {VIDEOS_BEFORE_WILLIAM_CALL} videos done. Next step: book your onboarding call
              with William. Ask in your WhatsApp group and he will send you a time.
            </p>
          </div>
        </div>
      )}

      {sections.map((section) => {
        const visible = section.modules.filter((module) => allowed(courseAccess, module.id));
        const sectionItems = visible.flatMap((module) => module.items);
        const sectionDone = sectionItems.filter((item) => doneIds.has(item.id)).length;
        return (
          <SectionCard
            key={section.id}
            title={section.title}
            action={
              <span className="num text-[11px] text-muted-foreground">
                {sectionDone}/{sectionItems.length}
              </span>
            }
          >
            <div className="space-y-2">
              {visible.map((module) => {
                const isOpen = open === module.id;
                const moduleDone = module.items.filter((item) => doneIds.has(item.id)).length;
                return (
                  <div key={module.id} className="rounded-lg border border-border">
                    <button
                      onClick={() => setOpen(isOpen ? null : module.id)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                      <span className="min-w-0 flex-1 text-[13px] font-medium">{module.title}</span>
                      <span className="num shrink-0 text-[11px] text-muted-foreground">
                        {moduleDone}/{module.items.length}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="space-y-1.5 border-t border-border p-3">
                        {module.items.length ? (
                          module.items.map((item) => (
                            <ItemRow
                              key={item.id}
                              item={item}
                              done={doneIds.has(item.id)}
                              editable={editable}
                              onToggle={(value) => toggle.mutate({ itemId: item.id, done: value })}
                            />
                          ))
                        ) : (
                          <EmptyState>Nothing in this module yet.</EmptyState>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        );
      })}
    </div>
  );
}

function ItemRow({
  item,
  done,
  editable,
  onToggle,
}: {
  item: CourseItem;
  done: boolean;
  editable: boolean;
  onToggle: (value: boolean) => void;
}) {
  const { updateItem } = useCourseMutations();
  const [url, setUrl] = useState(item.url ?? "");
  const dirty = url.trim() !== (item.url ?? "");
  const Icon = item.kind === "video" ? PlayCircle : FileText;

  return (
    <div
      className={cn(
        "rounded-md border p-2.5",
        done ? "border-success/50 bg-success/5" : "border-border bg-card",
      )}
    >
      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={done}
          onChange={(event) => onToggle(event.target.checked)}
          className="size-4 shrink-0 accent-[var(--primary)]"
          aria-label={`Mark ${item.title} as finished`}
        />
        <Icon className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 text-[13px]">{item.title}</span>
        {item.url ? (
          <Button asChild size="sm" variant="outline">
            <a href={item.url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" /> {item.kind === "video" ? "Watch" : "Open"}
            </a>
          </Button>
        ) : (
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            Coming soon
          </span>
        )}
      </div>

      {editable && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Paste the video or document link"
            className="h-8 min-w-0 flex-1 text-[12px]"
          />
          <select
            value={item.kind}
            onChange={(event) =>
              updateItem.mutate({ id: item.id, patch: { kind: event.target.value } })
            }
            className="h-8 rounded-md border border-input bg-card px-2 text-[12px]"
          >
            <option value="video">Video</option>
            <option value="file">File</option>
          </select>
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={item.needed}
              onChange={(event) =>
                updateItem.mutate({ id: item.id, patch: { needed: event.target.checked } })
              }
              className="size-3.5 accent-[var(--primary)]"
            />
            Needed
          </label>
          <Button
            size="sm"
            variant={dirty ? "default" : "outline"}
            disabled={!dirty}
            onClick={() =>
              updateItem.mutate(
                { id: item.id, patch: { url: url.trim() || null } },
                {
                  onSuccess: () => toast.success("Link saved"),
                  onError: () => toast.error("Could not save that link"),
                },
              )
            }
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
