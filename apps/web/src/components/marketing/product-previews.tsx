import { FileText, Mic, Link2, Type, Send, CheckCircle2, XCircle } from "lucide-react";
import { MindMap } from "@/components/mind-map";
import { ReviewSignalBadge } from "@/components/review-signal-badge";
import { ReviewSignal } from "@aida/shared";

/**
 * Real fragments of the product's own UI, reused as marketing previews
 * instead of hand-built fake screenshots. Same components and class names
 * a signed-in user actually sees, just fed sample data.
 */

const SAMPLE_MIND_MAP = {
  nodes: [
    { id: "root", label: "Cell respiration", noteAnchor: "root" },
    { id: "glycolysis", label: "Glycolysis", noteAnchor: "glycolysis" },
    { id: "krebs", label: "Krebs cycle", noteAnchor: "krebs" },
    { id: "etc", label: "Electron transport", noteAnchor: "etc" },
  ],
  edges: [
    { source: "root", target: "glycolysis" },
    { source: "root", target: "krebs" },
    { source: "root", target: "etc" },
  ],
};

export function UploadModesPreview() {
  const modes = [
    { icon: FileText, label: "PDF" },
    { icon: Mic, label: "Audio" },
    { icon: Link2, label: "YouTube" },
    { icon: Type, label: "Notes" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {modes.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-muted-foreground"
        >
          <Icon className="size-5" />
          {label}
        </div>
      ))}
    </div>
  );
}

export function MindMapPreview() {
  return <MindMap data={SAMPLE_MIND_MAP} />;
}

export function TutorPreview() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="max-w-[85%] self-end rounded-2xl bg-brand-600 px-3.5 py-2 text-sm text-white">
        Why does the electron transport chain need oxygen?
      </div>
      <div className="max-w-[90%] self-start rounded-2xl bg-muted px-3.5 py-2 text-sm text-foreground">
        Oxygen is the final electron acceptor. Without it, the chain backs up and ATP
        production stalls, which is exactly why your notes call it the rate-limiting step.
      </div>
      <p className="self-start text-xs text-muted-foreground">from Cell respiration, p.4</p>
    </div>
  );
}

export function GradingPreview() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-success-600 bg-success-100 px-4 py-3 text-sm dark:bg-success-900/30">
        <CheckCircle2 className="size-4 shrink-0 text-success-600" />
        <span className="text-success-900 dark:text-success-100">
          Correct. Oxygen as final electron acceptor, well explained.
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-danger-600 bg-danger-100 px-4 py-3 text-sm dark:bg-danger-900/30">
        <XCircle className="size-4 shrink-0 text-danger-600" />
        <span className="text-danger-900 dark:text-danger-100">
          78%. Right mechanism, missing the ATP synthase step.
        </span>
      </div>
    </div>
  );
}

export function ReviewPreview() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm">
        <span className="font-medium">Krebs cycle</span>
        <ReviewSignalBadge signal={ReviewSignal.NEEDS_REVIEW} />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm">
        <span className="font-medium">Glycolysis</span>
        <ReviewSignalBadge signal={ReviewSignal.DUE} />
      </div>
    </div>
  );
}

export function SendRowPreview() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-muted-foreground">
      Ask anything about this topic
      <Send className="ml-auto size-4 text-brand-600" />
    </div>
  );
}
