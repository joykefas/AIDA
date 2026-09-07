import { ShieldCheck, Lock, UserCheck, FileCheck2 } from "lucide-react";

const POINTS = [
  {
    icon: Lock,
    title: "Your material stays yours",
    body: "Uploaded documents and audio are encrypted in transit and at rest, used only to generate your notes, tutor answers, and quizzes.",
  },
  {
    icon: UserCheck,
    title: "Built for a younger userbase, on purpose",
    body: "Age-checked at signup. Accounts under 18 get no behavioral ad tracking and no third-party data sharing, by default, not as a toggle.",
  },
  {
    icon: ShieldCheck,
    title: "Export or delete, anytime",
    body: "A real \"export my data\" and \"delete my account\" path, not just a line in a privacy policy.",
  },
  {
    icon: FileCheck2,
    title: "No surprise third parties",
    body: "Every service that touches your material, from processing to storage, is named in the privacy policy. Nothing quietly added later.",
  },
] as const;

export function Trust() {
  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 text-center sm:grid-cols-2 sm:text-left lg:grid-cols-4 lg:divide-x lg:divide-border lg:text-left">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="lg:px-8 lg:first:pl-0 lg:last:pr-0">
              <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-lg bg-muted text-brand-600 sm:mx-0">
                <Icon className="size-4.5" />
              </div>
              <h3 className="font-medium">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
