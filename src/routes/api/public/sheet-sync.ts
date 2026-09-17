import { createFileRoute } from "@tanstack/react-router";

/**
 * Overnight Active Client Sheet sync. Called by the scheduled job with the
 * shared cron secret; it only files rows for approval, it never changes clients
 * on its own and never writes to the sheet.
 */
export const Route = createFileRoute("/api/public/sheet-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const allowed = [process.env["SHEET_CRON_KEY"], process.env["LOVABLE_CRON_SECRET"]].filter(
          (value): value is string => Boolean(value),
        );
        const provided = request.headers.get("x-cron-secret");
        if (!provided || !allowed.includes(provided)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runSheetSync } = await import("@/lib/sheet-sync.server");
        const result = await runSheetSync(supabaseAdmin);

        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 502,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
