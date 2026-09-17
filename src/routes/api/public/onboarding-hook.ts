import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Amalor / GHL automation calls this when a client is tagged paid or signs the
 * agreement. It only files or advances an onboarding card — it never creates a
 * client profile on its own, so a human still presses the portal button.
 */
const Payload = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200).optional(),
  program: z.string().max(40).optional(),
  deal_value: z.string().max(60).optional(),
  closer: z.string().max(60).optional(),
  event: z.enum(["paid", "agreement_sent", "agreement_signed"]).default("paid"),
});

const STAMP: Record<string, string> = {
  paid: "paid_at",
  agreement_sent: "agreement_sent_at",
  agreement_signed: "agreement_signed_at",
};

export const Route = createFileRoute("/api/public/onboarding-hook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["ONBOARDING_HOOK_SECRET"];
        const provided = request.headers.get("x-onboarding-secret");
        if (!secret || !provided || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        let parsed;
        try {
          parsed = Payload.parse(await request.json());
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { normaliseProgram } = await import("@/lib/bge");
        const now = new Date().toISOString();
        const stamp = STAMP[parsed.event] ?? "paid_at";

        const { data: existing } = await supabaseAdmin
          .from("onboarding_cases")
          .select("id, stage, name, email")
          .or(
            parsed.email
              ? `email.ilike.${parsed.email},name.ilike.${parsed.name}`
              : `name.ilike.${parsed.name}`,
          )
          .limit(1);

        const found = (existing ?? [])[0];

        if (found) {
          await supabaseAdmin
            .from("onboarding_cases")
            .update({ stage: parsed.event, [stamp]: now } as never)
            .eq("id", found.id);
          await supabaseAdmin.from("onboarding_events").insert({
            case_id: found.id,
            stage: parsed.event,
            detail: "Updated by the Amalor automation",
            actor: "Amalor",
          } as never);
          return Response.json({ ok: true, case_id: found.id, updated: true });
        }

        const { data: created, error } = await supabaseAdmin
          .from("onboarding_cases")
          .insert({
            name: parsed.name,
            email: parsed.email ?? null,
            program: normaliseProgram(parsed.program ?? null),
            deal_value: parsed.deal_value ?? null,
            closer: parsed.closer ?? null,
            stage: parsed.event,
            source: "webhook",
            [stamp]: now,
          } as never)
          .select("id")
          .single();
        if (error) return new Response("Could not save", { status: 500 });

        const caseId = (created as { id: string }).id;
        await supabaseAdmin.from("onboarding_events").insert({
          case_id: caseId,
          stage: parsed.event,
          detail: "Created by the Amalor automation",
          actor: "Amalor",
        } as never);
        await supabaseAdmin.from("notifications").insert({
          audience: "team",
          kind: "info",
          title: `${parsed.name} has paid — onboarding started`,
          body: "Came in from Amalor. Send the agreement, then invite them into the portal.",
        });

        return Response.json({ ok: true, case_id: caseId, created: true });
      },
    },
  },
});
