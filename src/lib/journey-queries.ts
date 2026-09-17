import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toClient, type Client, type ClientRow } from "@/lib/bge";
import type {
  ApprovalRow,
  DelayRow,
  DeliveryRow,
  InviteRow,
  IssueRow,
  NotificationRow,
  PauseRow,
  RequestRow,
  StrategyRow,
  TaskRow,
  UploadRow,
} from "@/lib/journey";
import { getMyClientProfile } from "@/lib/client-profile.functions";
import { checkTeamAccess } from "@/lib/team-access.functions";

type Tables = Database["public"]["Tables"];
type Insert<T extends keyof Tables> = Tables[T]["Insert"];
type Update<T extends keyof Tables> = Tables[T]["Update"];

/* ---------------- tasks ---------------- */

export function useTasks(clientId?: string) {
  return useQuery({
    queryKey: ["client_tasks", clientId ?? "all"],
    queryFn: async (): Promise<TaskRow[]> => {
      let query = supabase.from("client_tasks").select("*").order("phase_id").order("sort_order");
      if (clientId) query = query.eq("client_id", clientId);
      const { data, error } = await query;
      if (error) throw error;
      return data as TaskRow[];
    },
  });
}

export function useTaskMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["client_tasks"] });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Update<"client_tasks"> }) => {
      const { error } = await supabase
        .from("client_tasks")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const add = useMutation({
    mutationFn: async (input: Insert<"client_tasks">) => {
      const { error } = await supabase.from("client_tasks").insert(input as never);
      if (error) throw error;

      const owner = (input as { owner?: string | null }).owner ?? null;
      const clientId = (input as { client_id?: string }).client_id;
      // A new step assigned to someone should show up in their bell straight away.
      if (owner && owner !== "Client" && clientId) {
        await supabase.from("notifications").insert({
          client_id: clientId,
          audience: "team",
          kind: "action",
          owner,
          title: `${owner}: ${(input as { title?: string }).title ?? "New step"}`,
          body: "Open the client to see the new task.",
        } as never);
      }
      if (owner === "Client" && clientId) {
        await supabase.from("notifications").insert({
          client_id: clientId,
          audience: "client",
          kind: "action",
          title: `New step for you: ${(input as { title?: string }).title ?? "a new step"}`,
          body: "Open your roadmap to see what we need.",
        } as never);
      }
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { update, add, remove };
}

/* ---------------- delays ---------------- */

export function useDelays(clientId: string) {
  return useQuery({
    queryKey: ["client_delays", clientId],
    queryFn: async (): Promise<DelayRow[]> => {
      const { data, error } = await supabase
        .from("client_delays")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DelayRow[];
    },
  });
}

export function useAddDelay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Insert<"client_delays">) => {
      const { error } = await supabase.from("client_delays").insert(input as never);
      if (error) throw error;
      if ((input as { cause?: string }).cause === "client") {
        await supabase.from("notifications").insert({
          client_id: (input as { client_id: string }).client_id,
          audience: "team",
          kind: "action",
          owner: "Drilon",
          title: "Drilon: Client reported a journey delay",
          body:
            (input as { reason?: string | null }).reason ?? "Open the client journey for details.",
        } as never);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["client_delays"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useRemoveDelay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_delays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_delays"] }),
  });
}

/* ---------------- pauses ---------------- */

export function usePauses(clientId: string) {
  return useQuery({
    queryKey: ["client_pauses", clientId],
    queryFn: async (): Promise<PauseRow[]> => {
      const { data, error } = await supabase
        .from("client_pauses")
        .select("*")
        .eq("client_id", clientId)
        .order("paused_on", { ascending: false });
      if (error) throw error;
      return data as PauseRow[];
    },
  });
}

export function usePauseMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["client_pauses"] });

  const add = useMutation({
    mutationFn: async (input: Insert<"client_pauses">) => {
      const { error } = await supabase.from("client_pauses").insert(input as never);
      if (error) throw error;
      if ((input as { by_client?: boolean }).by_client) {
        await supabase.from("notifications").insert({
          client_id: (input as { client_id: string }).client_id,
          audience: "team",
          kind: "action",
          owner: "Drilon",
          title: "Drilon: Client requested a journey pause",
          body:
            (input as { reason?: string | null }).reason ?? "Open the client journey for details.",
        } as never);
      }
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_pauses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, remove };
}

/* ---------------- strategy ---------------- */

export function useStrategy(clientId: string) {
  return useQuery({
    queryKey: ["strategy_versions", clientId],
    queryFn: async (): Promise<StrategyRow[]> => {
      const { data, error } = await supabase
        .from("strategy_versions")
        .select("*")
        .eq("client_id", clientId)
        .order("version", { ascending: false });
      if (error) throw error;
      return data as StrategyRow[];
    },
  });
}

export function useAddStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Insert<"strategy_versions">) => {
      const { error } = await supabase.from("strategy_versions").insert(input as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["strategy_versions"] }),
  });
}

export function useUpdateStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Update<"strategy_versions"> }) => {
      const { error } = await supabase
        .from("strategy_versions")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["strategy_versions"] }),
  });
}

/* ---------------- issues ---------------- */

export function useIssues(clientId?: string) {
  return useQuery({
    queryKey: ["client_issues", clientId ?? "all"],
    queryFn: async (): Promise<IssueRow[]> => {
      let query = supabase
        .from("client_issues")
        .select("*")
        .order("created_at", { ascending: false });
      if (clientId) query = query.eq("client_id", clientId);
      const { data, error } = await query;
      if (error) throw error;
      return data as IssueRow[];
    },
  });
}

export function useIssueMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["client_issues"] });
  const add = useMutation({
    mutationFn: async (input: Insert<"client_issues">) => {
      const { error } = await supabase.from("client_issues").insert(input as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Update<"client_issues"> }) => {
      const { error } = await supabase
        .from("client_issues")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_issues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { add, update, remove };
}

/* ---------------- requests ---------------- */

export function useRequests(clientId?: string) {
  return useQuery({
    queryKey: ["client_requests", clientId ?? "all"],
    queryFn: async (): Promise<RequestRow[]> => {
      let query = supabase
        .from("client_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (clientId) query = query.eq("client_id", clientId);
      const { data, error } = await query;
      if (error) throw error;
      return data as RequestRow[];
    },
  });
}

export function useRequestMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["client_requests"] });
  const add = useMutation({
    mutationFn: async (input: Insert<"client_requests">) => {
      const { error } = await supabase.from("client_requests").insert(input as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Update<"client_requests"> }) => {
      const { error } = await supabase
        .from("client_requests")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { add, update };
}

/* ---------------- uploads ---------------- */

export function useUploads(clientId: string) {
  return useQuery({
    queryKey: ["client_uploads", clientId],
    queryFn: async (): Promise<UploadRow[]> => {
      const { data, error } = await supabase
        .from("client_uploads")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UploadRow[];
    },
  });
}

export function useUploadMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["client_uploads"] });
  const add = useMutation({
    mutationFn: async (input: Insert<"client_uploads">) => {
      const { error } = await supabase.from("client_uploads").insert(input as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_uploads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { add, remove };
}

/* ---------------- approvals ---------------- */

export function useApprovals(clientId: string) {
  return useQuery({
    queryKey: ["client_approvals", clientId],
    queryFn: async (): Promise<ApprovalRow[]> => {
      const { data, error } = await supabase
        .from("client_approvals")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ApprovalRow[];
    },
  });
}

export function useAddApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Insert<"client_approvals">) => {
      const { error } = await supabase.from("client_approvals").insert(input as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_approvals"] }),
  });
}

/* ---------------- delivery log ---------------- */

export function useDeliveries(clientId: string) {
  return useQuery({
    queryKey: ["delivery_log", clientId],
    queryFn: async (): Promise<DeliveryRow[]> => {
      const { data, error } = await supabase
        .from("delivery_log")
        .select("*")
        .eq("client_id", clientId)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data as DeliveryRow[];
    },
  });
}

export function useAddDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Insert<"delivery_log">) => {
      const { error } = await supabase.from("delivery_log").insert(input as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery_log"] }),
  });
}

/* ---------------- notifications ---------------- */

export async function notify(input: Insert<"notifications">) {
  await supabase.from("notifications").insert(input as never);
}

export function useNotifications(audience: "team" | "client") {
  return useQuery({
    queryKey: ["notifications", audience],
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("audience", audience)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data as NotificationRow[];
    },
    refetchInterval: 60_000,
  });
}

export function useNotificationReads() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["notification_reads"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("notification_reads").select("notification_id");
      if (error) throw error;
      return (data as { notification_id: string }[]).map((r) => r.notification_id);
    },
  });

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId || ids.length === 0) return;
      const { error } = await supabase
        .from("notification_reads")
        .upsert(ids.map((id) => ({ notification_id: id, user_id: userId })) as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification_reads"] }),
  });

  return { readIds: list.data ?? [], markRead };
}

/* ---------------- portal access ---------------- */

export function useInvites(clientId: string) {
  return useQuery({
    queryKey: ["client_invites", clientId],
    queryFn: async (): Promise<InviteRow[]> => {
      const { data, error } = await supabase
        .from("client_invites")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at");
      if (error) throw error;
      return data as InviteRow[];
    },
  });
}

export function useInviteMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["client_invites"] });
  const add = useMutation({
    mutationFn: async (input: Insert<"client_invites">) => {
      const { error } = await supabase.from("client_invites").insert(input as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { add, remove };
}

/** The signed-in client's own record, or null for team members. */
export function useMyClient() {
  return useQuery({
    queryKey: ["my_client"],
    queryFn: async (): Promise<Client | null> => {
      const data = await getMyClientProfile();
      return data ? toClient(data as ClientRow) : null;
    },
    // While they are waiting on verification, keep checking so the rest of the
    // portal opens up on its own the moment a BGE member verifies them.
    refetchInterval: (query) =>
      (query.state.data as { portal_status?: string | null } | null | undefined)?.portal_status ===
      "pending"
        ? 20_000
        : false,
    refetchOnWindowFocus: true,
  });
}

export async function isTeamMember() {
  return checkTeamAccess();
}

/** The signed-in person's display name, used to default "my tasks" filters. */
export function useMyName() {
  return useQuery({
    queryKey: ["my_name"],
    queryFn: async (): Promise<string> => {
      const { data } = await supabase.auth.getUser();
      const meta = data.user?.user_metadata as { display_name?: string } | undefined;
      return meta?.display_name || data.user?.email?.split("@")[0] || "";
    },
    staleTime: 300_000,
  });
}
