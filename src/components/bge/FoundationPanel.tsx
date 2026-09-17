import { ExternalLink, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState, SectionCard } from "@/components/bge/atoms";
import { GroupCallsPanel } from "@/components/bge/GroupCallsPanel";
import { useTeamLinks } from "@/lib/queries";

/**
 * Done by you clients do not get a roadmap. They get one place with the weekly
 * group calls, the course content and the key links they need.
 */
export function LinkList({
  category,
  title,
  editable = false,
}: {
  category: string;
  title: string;
  editable?: boolean;
}) {
  const { data: links = [] } = useTeamLinks();
  const rows = links.filter((row) => row.category === category);
  return (
    <SectionCard title={title}>
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <GraduationCap className="size-4 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span>
              {row.link && (
                <Button asChild size="sm" variant="outline">
                  <a href={row.link} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-3.5" /> Open
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState>
          {editable
            ? "Nothing added yet — add these on the Important links page."
            : "Your BGE contact will add these shortly."}
        </EmptyState>
      )}
    </SectionCard>
  );
}

export function FoundationPanel({ editable = false }: { editable?: boolean }) {
  return (
    <div className="space-y-4">
      <GroupCallsPanel editable={editable} />
      <LinkList category="course" title="BGE course content" editable={editable} />
      <LinkList category="website" title="Key links" editable={editable} />
    </div>
  );
}
