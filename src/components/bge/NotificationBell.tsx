import { useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/journey";
import { useNotificationReads, useNotifications } from "@/lib/journey-queries";

export function NotificationBell({ audience }: { audience: "team" | "client" }) {
  const { data: items } = useNotifications(audience);
  const { readIds, markRead } = useNotificationReads();
  const [open, setOpen] = useState(false);

  const list = items ?? [];
  const unread = list.filter((n) => !readIds.includes(n.id));

  const toggle = () => {
    setOpen((v) => !v);
    if (!open && unread.length > 0) markRead.mutate(unread.map((n) => n.id));
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative rounded-md p-1.5 hover:bg-accent"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unread.length > 0 && (
          <span className="num absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-border bg-card shadow-card">
            <p className="border-b border-border px-3 py-2 text-[12px] font-semibold">
              Notifications
            </p>
            <ul className="max-h-80 overflow-y-auto">
              {list.length === 0 && (
                <li className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                  Nothing new.
                </li>
              )}
              {list.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "border-b border-border px-3 py-2 text-[12px] last:border-0",
                    !readIds.includes(n.id) && "bg-accent/40",
                  )}
                >
                  <p className="font-medium">{n.title}</p>
                  {n.body && (
                    <p className="text-muted-foreground">
                      {n.body.replace(/\s*\/clients\/[0-9a-f-]{36}\s*/i, " ").trim()}
                    </p>
                  )}
                  <p className="num mt-0.5 text-[10px] text-muted-foreground">
                    {formatDate(n.created_at)}
                  </p>
                  {audience === "team" && n.client_id && (
                    <Link
                      to="/clients/$clientId"
                      params={{ clientId: n.client_id }}
                      search={{ tab: "tasks" }}
                      onClick={() => setOpen(false)}
                      className="mt-1 inline-block text-[11px] font-semibold text-primary hover:underline"
                    >
                      Open client
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
