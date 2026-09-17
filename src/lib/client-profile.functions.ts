import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const programKey = (value: string | null | undefined) => {
  const text = (value ?? "").toLowerCase();
  if (text.includes("done for") || text.includes("dfy")) return "dfy";
  if (text.includes("done with") || text.includes("dwy")) return "dwy";
  if (text.includes("done by") || text.includes("dby")) return "dby";
  // A brand new sign-up has no package set yet, so they start on the
  // Done for you welcome documents until the team confirms their tier.
  return text || "dfy";
};

/**
 * Returns a signed-in client's own profile. Pending and denied accounts only
 * receive the small set of fields needed to render their restricted screen.
 */
export const getMyClientProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: statusRow, error: statusError } = await supabaseAdmin
      .from("clients")
      .select("id, name, program, portal_status, portal_email, email, phone, content_plan")
      .eq("portal_user_id", context.userId)
      .maybeSingle();
    if (statusError) throw statusError;
    if (!statusRow) return null;
    if (statusRow.portal_status !== "verified") return statusRow;

    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", statusRow.id)
      .single();
    if (error) throw error;
    return data;
  });

/** Pending clients only need their own acknowledgement state. */
export const getMyOnboardingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string }) => ({ clientId: String(input.clientId) }))
  .handler(async ({ context, data: input }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("id", input.clientId)
      .maybeSingle();
    if (clientError) throw clientError;
    if (!client) return null;

    const { data: team } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", context.userId)
      .in("role", ["admin", "member"])
      .maybeSingle();
    if (!team) {
      const { data: ownClient } = await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("id", input.clientId)
        .eq("portal_user_id", context.userId)
        .maybeSingle();
      if (!ownClient) throw new Error("Unauthorized");
    }

    const { data, error } = await supabaseAdmin
      .from("client_onboarding")
      .select("client_id, full_name, phone, email, agreed, completed_at")
      .eq("client_id", client.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

/** Team members receive the document library; clients receive only visible documents for their programme. */
export const getOnboardingDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { program?: string | null; previewClientId?: string | null }) => ({
    program: input.program ?? null,
    previewClientId: input.previewClientId ?? null,
  }))
  .handler(async ({ context, data: input }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: team } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", context.userId)
      .in("role", ["admin", "member"])
      .maybeSingle();
    let query = supabaseAdmin
      .from("onboarding_docs")
      .select("*")
      .order("program")
      .order("sort_order");

    if (team) {
      if (input.previewClientId && input.program) {
        const { data: previewClient } = await supabaseAdmin
          .from("clients")
          .select("program")
          .eq("id", input.previewClientId)
          .maybeSingle();
        if (!previewClient || programKey(previewClient.program) !== programKey(input.program))
          return [];
        query = query
          .eq("program", programKey(previewClient.program).toUpperCase())
          .or("hidden.is.false,hidden.is.null");
      }
    } else {
      const { data: client, error: clientError } = await supabaseAdmin
        .from("clients")
        .select("program")
        .eq("portal_user_id", context.userId)
        .maybeSingle();
      if (clientError) throw clientError;
      if (!client || programKey(client.program) !== programKey(input.program)) return [];
      query = query
        .eq("program", programKey(client.program).toUpperCase())
        .or("hidden.is.false,hidden.is.null");
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  });
