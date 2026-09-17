import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Step one of the client portal: the client confirms their details and agrees
 * to the onboarding documents for their programme. Their portal stays locked
 * until a team member verifies them. Runs server side so the client never
 * needs direct write access to their profile or roadmap.
 */
export const finishPortalOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fullName?: string; phone?: string; agreed: string[] }) => ({
    fullName: (input.fullName ?? "").trim().slice(0, 120),
    phone: (input.phone ?? "").trim().slice(0, 40),
    agreed: (Array.isArray(input.agreed) ? input.agreed : []).slice(0, 40).map(String),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: client, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("portal_user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!client) throw new Error("We could not find your client profile.");

    const row = client as unknown as Record<string, string | null>;
    const clientId = row["id"] as string;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("client_onboarding")
      .select("completed_at")
      .eq("client_id", clientId)
      .maybeSingle();
    if (existingError) throw existingError;
    const firstCompletion = !existing?.completed_at;

    const { error: onboardingError } = await supabaseAdmin.from("client_onboarding").upsert(
      {
        client_id: clientId,
        full_name: data.fullName || row["name"],
        phone: data.phone || row["phone"],
        email: row["portal_email"] ?? row["email"],
        agreed: data.agreed,
        completed_at: new Date().toISOString(),
      } as never,
      { onConflict: "client_id" },
    );
    if (onboardingError) throw onboardingError;

    const { error: taskError } = await supabaseAdmin
      .from("client_tasks")
      .update({ status: "done", actual_date: new Date().toISOString().slice(0, 10) })
      .eq("client_id", clientId)
      .eq("step_key", "p1-welcome-docs");
    if (taskError) throw taskError;

    if (firstCompletion) {
      const { error: notificationError } = await supabaseAdmin.from("notifications").insert({
        client_id: clientId,
        audience: "team",
        kind: "action",
        owner: "Drilon",
        title: `Verify ${row["name"]} — onboarding documents done`,
        body: "They have read and confirmed every welcome document. Verify them to open their whole portal.",
      } as never);
      if (notificationError) throw notificationError;

      const { error: auditError } = await supabaseAdmin.from("audit_log").insert({
        user_name: `${row["name"]} (client)`,
        action: "portal_onboarding_complete",
        client_name: row["name"],
        detail: `Agreed to ${data.agreed.length} onboarding documents`,
      } as never);
      if (auditError) throw auditError;
    }

    return { ok: true };
  });
