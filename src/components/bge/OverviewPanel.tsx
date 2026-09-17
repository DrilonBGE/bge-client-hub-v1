import { EditRow, LongField, SelectField, TextField } from "@/components/bge/fields";
import { ProgressBar } from "@/components/bge/atoms";
import { useCourse, useCourseProgress } from "@/lib/course";
import { useUpdateClient } from "@/lib/queries";
import { DIFFICULTY, HEALTH, healthMeta } from "@/lib/journey";
import { PAYMENT_METHODS, PROGRAMS, PROGRAM_LABELS, VSL_WRITERS, type Client } from "@/lib/bge";

/** Splits a stored payment value into a known method plus free text for "Other". */
function splitPayment(payment: string | null | undefined) {
  const value = payment ?? "";
  const known = PAYMENT_METHODS.find(
    (method) => method !== "Other" && value.toLowerCase().startsWith(method.toLowerCase()),
  );
  if (known) return { method: known, other: "" };
  return { method: value ? "Other" : "", other: value };
}

/** How far this client has actually got through the BGE course content. */
function CourseProgressCard({ client }: { client: Client }) {
  const { data: tree = [] } = useCourse();
  const { data: progress = [] } = useCourseProgress(client.id);
  const doneIds = new Set(progress.map((row) => row.item_id));
  const items = tree.flatMap((section) => section.modules.flatMap((module) => module.items));
  if (!items.length) return null;

  const videos = items.filter((item) => item.kind === "video");
  const videosDone = videos.filter((item) => doneIds.has(item.id)).length;
  const done = items.filter((item) => doneIds.has(item.id)).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[12px] font-semibold">BGE Course Progress</p>
        <p className="num text-[12px] text-muted-foreground">
          {videosDone} of {videos.length} videos watched
        </p>
      </div>
      <div className="mt-2">
        <ProgressBar pct={pct} phase={client.phase} />
      </div>
      <p className="num mt-1.5 text-[11px] text-muted-foreground">
        {done} of {items.length} items marked finished · {pct}%
      </p>
    </div>
  );
}

export function OverviewPanel({ client }: { client: Client }) {
  const update = useUpdateClient();
  const save = (patch: Partial<Client>) => update.mutate({ id: client.id, patch });
  const payment = splitPayment(client.payment);

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-[12px] text-muted-foreground">
        Everything here can be changed. Boxes marked “Client sees” appear in their portal; dashed
        boxes stay with the team.
      </p>

      <CourseProgressCard client={client} />

      <div className="space-y-2.5">
        <EditRow
          label="Programme"
          hint={PROGRAM_LABELS[client.program ?? ""] ?? "Pick their tier or tier combination."}
        >
          <SelectField
            value={client.program}
            options={PROGRAMS}
            onSave={(program) => save({ program })}
          />
        </EditRow>

        <EditRow label="Contract value">
          <TextField
            value={client.active}
            placeholder="£4,500"
            onSave={(active) => save({ active })}
          />
        </EditRow>

        <EditRow label="Payment method">
          <SelectField
            value={payment.method}
            options={PAYMENT_METHODS}
            onSave={(method) =>
              save({ payment: method === "Other" ? payment.other || "Other" : method })
            }
          />
          {payment.method === "Other" && (
            <div className="mt-2">
              <TextField
                value={payment.other === "Other" ? "" : payment.other}
                placeholder="Type exactly how they pay"
                onSave={(other) => save({ payment: other })}
              />
            </div>
          )}
        </EditRow>

        <EditRow label="Leaving date">
          <TextField
            value={client.leaving}
            placeholder="9th June 27"
            onSave={(leaving) => save({ leaving })}
          />
        </EditRow>

        <EditRow label="Email">
          <TextField
            value={client.email}
            type="email"
            placeholder="name@business.com"
            onSave={(email) => save({ email })}
          />
        </EditRow>

        <EditRow label="Phone">
          <TextField value={client.phone} placeholder="+44…" onSave={(phone) => save({ phone })} />
        </EditRow>

        <EditRow label="VSL writer">
          <SelectField
            value={client.vsl_writer}
            options={VSL_WRITERS}
            onSave={(vsl_writer) => save({ vsl_writer })}
          />
        </EditRow>

        <EditRow
          label="Journey start"
          hint="Changing this moves every week window and every expected date on the roadmap."
        >
          <TextField
            value={client.journey_start}
            type="date"
            onSave={(journey_start) => save({ journey_start: journey_start || null })}
          />
        </EditRow>

        <EditRow
          label="Launched?"
          hint="The same answer shown on the roadmap and the renewal page."
        >
          <SelectField
            value={client.launched ? "Launched" : "Not launched yet"}
            options={["Not launched yet", "Launched"]}
            onSave={(value) =>
              save({
                launched: value === "Launched",
                launched_date:
                  value === "Launched"
                    ? (client.launched_date ?? new Date().toISOString().slice(0, 10))
                    : null,
              } as Partial<Client>)
            }
          />
        </EditRow>

        <EditRow label="Launch date">
          <TextField
            value={client.launched_date}
            type="date"
            onSave={(launched_date) =>
              save({
                launched_date: launched_date || null,
                launched: Boolean(launched_date) || Boolean(client.launched),
              } as Partial<Client>)
            }
          />
        </EditRow>

        <EditRow
          label="Client health"
          internal
          hint="On track, needs attention or at risk — this drives the dashboard health list."
        >
          <SelectField
            value={healthMeta(client.health).label}
            options={HEALTH.map((item) => item.label)}
            onSave={(label) =>
              save({ health: HEALTH.find((item) => item.label === label)?.key ?? "green" })
            }
          />
        </EditRow>

        <EditRow label="How demanding" internal>
          <SelectField
            value={client.difficulty}
            options={DIFFICULTY}
            onSave={(difficulty) => save({ difficulty })}
          />
        </EditRow>

        <EditRow label="General feel" internal hint="Plain words about how this one is going.">
          <LongField
            value={client.feel_note}
            placeholder="How does working with them actually feel?"
            onSave={(feel_note) => save({ feel_note })}
          />
        </EditRow>
      </div>
    </div>
  );
}
