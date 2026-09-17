import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/bge/AppShell";
import { useBoard } from "@/components/bge/client-modal-context";
import { SectionCard } from "@/components/bge/atoms";
import { SheetInbox } from "@/components/bge/SheetInbox";
import { VerifySignups } from "@/components/bge/VerifySignups";
import { Button } from "@/components/ui/button";
import { ONBOARDING_EMAILS } from "@/lib/onboarding-emails";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — BGE Client Journey Board" },
      {
        name: "description",
        content:
          "Verify every client who signs up on their own link, then check them against the Active Client Sheet.",
      },
      { property: "og:title", content: "Onboarding — BGE Client Journey Board" },
      {
        property: "og:description",
        content: "Verify new portal sign-ups and keep the Active Client Sheet in step.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingPage,
});

/** The sign-up link that goes out in email 3, ready to copy. */
function SignUpLink() {
  const url = typeof window === "undefined" ? "/join" : `${window.location.origin}/join`;
  return (
    <SectionCard title="Their personal sign-up link (email 3)">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-md border border-border bg-background px-2 py-1 text-[12px]">
          {url}
        </code>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(url);
            toast.success("Link copied");
          }}
        >
          <Copy className="size-3.5" /> Copy link
        </Button>
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">
        They fill in their name, email, the date of their first payment and a password, then land
        straight in their portal with pre-verification access.
      </p>
    </SectionCard>
  );
}

function EmailReference() {
  return (
    <SectionCard title="Onboarding email wording (sent by Amalor)">
      <div className="space-y-2">
        {ONBOARDING_EMAILS.map((email) => (
          <details key={email.key} className="rounded-lg border border-border bg-background p-3">
            <summary className="cursor-pointer text-[13px] font-semibold">
              {email.audience} — {email.primary}
              <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                {email.secondary}
              </span>
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-[12px] text-muted-foreground">
              {email.body}
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                void navigator.clipboard.writeText(email.body);
                toast.success("Copied");
              }}
            >
              <Copy className="size-3.5" /> Copy wording
            </Button>
          </details>
        ))}
      </div>
    </SectionCard>
  );
}

function OnboardingPage() {
  const { sync } = useBoard();

  return (
    <AppShell
      title="Onboarding"
      subtitle="They sign up → you verify → the whole portal opens"
      sync={sync}
    >
      <div className="space-y-4">
        <VerifySignups />
        <SheetInbox />
        <SignUpLink />
        <EmailReference />
      </div>
    </AppShell>
  );
}
