import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useRealtimeClients, type SyncStatus } from "@/lib/queries";

type BoardContextValue = {
  sync: SyncStatus;
  openClient: (id: string) => void;
  /** Opens a client's page straight on the task itself. */
  openTask: (clientId: string, taskId?: string | null, tab?: string) => void;
  closeClient: () => void;
};

const BoardContext = createContext<BoardContextValue | null>(null);

const FALLBACK: BoardContextValue = {
  sync: "connecting",
  openClient: () => {},
  openTask: () => {},
  closeClient: () => {},
};

/** The link a task row points at, so it can be opened in a new tab as well. */
export function taskHref(clientId: string, taskId?: string | null, tab = "tasks") {
  const params = new URLSearchParams({ tab });
  if (taskId) params.set("task", taskId);
  return `/clients/${encodeURIComponent(clientId)}?${params.toString()}`;
}

export function useBoard() {
  // During a sign-in redirect a page can render for a frame before the
  // provider mounts; fall back rather than crash the whole screen.
  return useContext(BoardContext) ?? FALLBACK;
}

export function BoardProvider({ children }: { children: ReactNode }) {
  const sync = useRealtimeClients();

  const value = useMemo<BoardContextValue>(
    () => ({
      sync,
      openClient: (id) => {
        window.open(`/clients/${encodeURIComponent(id)}`, "_blank", "noopener,noreferrer");
      },
      openTask: (clientId, taskId, tab) => {
        window.open(taskHref(clientId, taskId, tab), "_blank", "noopener,noreferrer");
      },
      closeClient: () => window.close(),
    }),
    [sync],
  );

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}
