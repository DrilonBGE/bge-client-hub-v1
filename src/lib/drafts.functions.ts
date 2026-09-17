import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  kind: z.enum(["faq", "thankyou", "emails"]),
  clientName: z.string().min(1),
  niche: z.string().optional().default(""),
  program: z.string().optional().default(""),
  brief: z.string().optional().default(""),
});

const BRIEFS: Record<string, string> = {
  faq: "Write a FAQ section for this client's funnel: 8 questions with short, confident answers that remove buying objections.",
  thankyou:
    "Write a thank-you page for this client's funnel: a short confirmation headline, what happens next in 3 steps, and one line telling them to check their email.",
  emails:
    "Write a 5-email follow-up sequence for people who booked but haven't attended a call: subject line plus a short body for each, numbered Email 1 to Email 5.",
};

export const generateDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured yet.");

    const prompt = [
      BRIEFS[data.kind],
      `Client: ${data.clientName}.`,
      data.niche ? `Their niche: ${data.niche}.` : "",
      data.program ? `Programme: ${data.program}.` : "",
      data.brief ? `Extra context from the team: ${data.brief}` : "",
      "Write in plain British English, direct and specific, no hype and no emojis. Return plain text with clear headings, ready for a team member to edit.",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a senior direct-response copywriter working for an agency that builds funnels for coaches and consultants.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (response.status === 429) throw new Error("AI is busy right now — try again in a moment.");
    if (!response.ok) throw new Error("The draft could not be written just now.");

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("The draft came back empty.");
    return { content };
  });
