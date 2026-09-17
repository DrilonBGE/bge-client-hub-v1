import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  toClient,
  toPhase,
  type Client,
  type ClientRow,
  type PhaseRow,
  type PhaseTaskRow,
  type TeamLinkRow,
  type TeamMemberRow,
  type TodoRow,
  type AuditRow,
} from "@/lib/bge";

let auditUser = "Team";
export function setAuditUser(name: string) {
  auditUser = name;
}

/** Who is doing this, for stamps like "verified by". */
export function auditUserName() {
  return auditUser;
}

export async function logAudit(action: string, clientName: string | null, detail: string) {
  await supabase.from("audit_log").insert({
    action,
    client_name: clientName,
    detail,
    user_name: auditUser,
  });
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return (data as ClientRow[]).map(toClient);
    },
  });
}

/** Clients moved to the bin — recoverable until permanently deleted. */
export function useDeletedClients() {
  return useQuery({
    queryKey: ["clients_deleted"],
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return (data as ClientRow[]).map(toClient);
    },
  });
}

export function useBinClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: { id: string; name: string }) => {
      const { error } = await supabase
        .from("clients")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", client.id);
      if (error) throw error;
      await logAudit("client_binned", client.name, "Moved to the deleted folder");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["clients"] });
      void qc.invalidateQueries({ queryKey: ["clients_deleted"] });
    },
  });
}

export function useRestoreClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: { id: string; name: string }) => {
      const { error } = await supabase
        .from("clients")
        .update({ deleted_at: null })
        .eq("id", client.id);
      if (error) throw error;
      await logAudit("client_restored", client.name, "Restored from the deleted folder");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["clients"] });
      void qc.invalidateQueries({ queryKey: ["clients_deleted"] });
    },
  });
}

export function usePhases() {
  return useQuery({
    queryKey: ["phases"],
    queryFn: async (): Promise<PhaseRow[]> => {
      const { data, error } = await supabase.from("phase_tasks").select("*").order("phase_id");
      if (error) throw error;
      return (data as PhaseTaskRow[]).map(toPhase);
    },
    staleTime: 60_000,
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Client> }) => {
      const { error } = await supabase
        .from("clients")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["clients"] });
      const previous = qc.getQueryData<Client[]>(["clients"]);
      qc.setQueryData<Client[]>(["clients"], (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) qc.setQueryData(["clients"], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useAddClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; program: string; active: string; niche: string }) => {
      const { error } = await supabase.from("clients").insert({
        name: input.name,
        program: input.program || null,
        active: input.active || null,
        niche: input.niche || null,
        phase: 1,
      });
      if (error) throw error;
      await logAudit("client_added", input.name, "Added to the board");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: { id: string; name: string }) => {
      const { error } = await supabase.from("clients").delete().eq("id", client.id);
      if (error) throw error;
      await logAudit("client_deleted", client.name, "Deleted permanently");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useTodos() {
  return useQuery({
    queryKey: ["todos"],
    queryFn: async (): Promise<TodoRow[]> => {
      const { data, error } = await supabase
        .from("global_todos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TodoRow[];
    },
  });
}

export function useTodoMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["todos"] });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const add = useMutation({
    mutationFn: async (input: {
      text: string;
      owner: string;
      due_date: string;
      priority?: string;
      issued_by?: string;
      detail?: string;
      source?: string;
      client_id?: string | null;
      client_name?: string | null;
    }) => {
      const { error } = await supabase.from("global_todos").insert({
        text: input.text,
        owner: input.owner || null,
        due_date: input.due_date || null,
        priority: input.priority || "medium",
        issued_by: input.issued_by || null,
        detail: input.detail || null,
        source: input.source || "manual",
        client_id: input.client_id || null,
        client_name: input.client_name || null,
      });
      if (error) throw error;

      // The person it lands on needs to actually hear about it.
      if (input.owner) {
        await supabase.from("notifications").insert({
          audience: "team",
          kind: "action",
          owner: input.owner,
          client_id: input.client_id || null,
          title: `${input.owner}: ${input.text}`,
          body: [
            input.client_name ? `For ${input.client_name}.` : null,
            input.detail || null,
            input.due_date ? `Due ${input.due_date}.` : null,
          ]
            .filter(Boolean)
            .join(" "),
        } as never);
      }
    },
    onSuccess: invalidate,
  });

  const patch = useMutation({
    mutationFn: async (input: {
      id: string;
      values: { priority?: string; owner?: string | null; due_date?: string | null };
    }) => {
      const { error } = await supabase.from("global_todos").update(input.values).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggle = useMutation({
    mutationFn: async (input: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("global_todos")
        .update({
          done: input.done,
          done_at: input.done ? new Date().toISOString() : null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("global_todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, toggle, remove, patch };
}

export function useTeamLinks() {
  return useQuery({
    queryKey: ["team_links"],
    queryFn: async (): Promise<TeamLinkRow[]> => {
      const { data, error } = await supabase.from("team_links").select("*").order("sort_order");
      if (error) throw error;
      return data as TeamLinkRow[];
    },
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team_members"],
    queryFn: async (): Promise<TeamMemberRow[]> => {
      const { data, error } = await supabase.from("team_members").select("*").order("created_at");
      if (error) throw error;
      return data as TeamMemberRow[];
    },
  });
}

export function useAuditLog() {
  return useQuery({
    queryKey: ["audit_log"],
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as AuditRow[];
    },
  });
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is_admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      if (error) return false;
      return !!data;
    },
  });
}

export type SyncStatus = "connecting" | "live" | "error";

/** Subscribes to client changes and keeps the cache fresh. */
export function useRealtimeClients(): SyncStatus {
  const qc = useQueryClient();
  const [status, setStatus] = useState<SyncStatus>("connecting");

  useEffect(() => {
    const channel = supabase
      .channel("clients-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        void qc.invalidateQueries({ queryKey: ["clients"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "global_todos" }, () => {
        void qc.invalidateQueries({ queryKey: ["todos"] });
      })
      .subscribe((state) => {
        if (state === "SUBSCRIBED") setStatus("live");
        else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") setStatus("error");
        else setStatus("connecting");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return status;
}
