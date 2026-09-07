"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shapes, BookOpen, Sparkles, Sigma, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { clientFetch } from "@/lib/api-client";
import { LearningStyle } from "@aida/shared";

const STYLES: { value: LearningStyle; label: string; blurb: string; icon: typeof Shapes }[] = [
  { value: LearningStyle.DIAGRAMS, label: "Diagrams", blurb: "Show me how the pieces connect.", icon: Shapes },
  { value: LearningStyle.STORIES, label: "Stories", blurb: "Wrap it in a narrative I can follow.", icon: BookOpen },
  { value: LearningStyle.ANALOGIES, label: "Analogies", blurb: "Map it onto something I already know.", icon: Sparkles },
  { value: LearningStyle.FORMULAS, label: "Formulas", blurb: "Give it to me precise and compact.", icon: Sigma },
  { value: LearningStyle.AUDIO, label: "Audio", blurb: "Explain it like you're talking me through it.", icon: Headphones },
];

export default function LearningStylePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<LearningStyle | null>(null);
  const [saving, setSaving] = useState(false);

  async function commit(style: LearningStyle | null) {
    setSaving(true);
    if (style) {
      await clientFetch("/users/me/learning-style", {
        method: "PATCH",
        body: JSON.stringify({ learningStyle: style }),
      }).catch(() => {});
    }
    router.push("/onboarding/first-upload");
  }

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          How do you learn best?
        </h1>
        <p className="text-muted-foreground">
          Every explanation, notes, tutor answers, and quiz feedback, will match this. You can
          change it anytime.
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {STYLES.map(({ value, label, blurb, icon: Icon }) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSelected(value)}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                isSelected
                  ? "border-primary bg-accent"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent/50",
              )}
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                <Icon className="size-5" />
              </div>
              <div>
                <div className="font-medium">{label}</div>
                <div className="text-sm text-muted-foreground">{blurb}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex w-full max-w-xs flex-col items-center gap-3">
        <Button className="w-full" disabled={!selected || saving} onClick={() => commit(selected)}>
          {saving ? "Saving…" : "Continue"}
        </Button>
        <button
          type="button"
          onClick={() => commit(null)}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
