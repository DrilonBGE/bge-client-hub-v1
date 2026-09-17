import { useMemo } from "react";
import { BellRing } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { EmptyState, SectionCard } from "@/components/bge/atoms";
import { ShowMore } from "@/components/bge/ShowMore";
import { formatDate } from "@/lib/journey";
import { useMyName, useNotifications } from "@/lib/journey-queries";

/**
 * Everything waiting on this person specifically — the copy to write, the
 * review to do, the launch to press — rather than the whole team's feed.
 */
export function ForYouPanel() {
  const { data: myName = "" } = useMyName();
  const { data: items = [] } = useNotifications("team");

  const mine = useMemo(() => {
    const first = myName.split(" ")[0]?.toLowerCase() ?? "";
    if (!first) return [];
    return items.filter((item) => {
      const owner = (item as { owner?: string | null }).owner?.toLowerCase() ?? "";
      if (owner) return owner.includes(first);
      return item.title.toLowerCase().includes(first);
    });
  }, [items, myName]);

  return (
    <SectionCard title="For you">
      {mine.length ? (
        <ShowMore
          items={mine}
          limit={3}
          noun="more"
          render={(item) => {
            const id = item.client_id;
            const verify = item.title.toLowerCase().startsWith("verify ");
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-md border border-border px-3 py-2.5"
              >
                <BellRing className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="num text-[10px] uppercase tracking-wide text-muted-foreground">
                    {formatDate(item.created_at)}
                  </span>
                </span>
                {verify ? (
                  <Link
                    to="/onboarding"
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Verify them
                  </Link>
                ) : (
                  id && (
                    <Link
                      to="/clients/$clientId"
                      params={{ clientId: id }}
                      search={{ tab: "tasks" }}
                      target="_blank"
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Open the task
                    </Link>
                  )
                )}
              </div>
            );
          }}
        />
      ) : (
        <EmptyState>Nothing is waiting on you right now.</EmptyState>
      )}
    </SectionCard>
  );
}
