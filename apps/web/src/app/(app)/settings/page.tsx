"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Trash2,
  CheckCircle2,
  Brain,
  Layers,
  BookOpen,
  Sparkles,
  Binary,
  Headphones,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { clientFetch, ApiClientError } from "@/lib/api-client";
import { LearningStyle, type UserProfile, type UserDataExport } from "@aida/shared";
import { cn } from "cn";

const LEARNING_STYLES = [
  {
    value: LearningStyle.DIAGRAMS,
    label: "Diagrams & Visuals",
    desc: "Visual frameworks, charts, and structured mind-map connections.",
    icon: Layers,
  },
  {
    value: LearningStyle.STORIES,
    label: "Stories & Narratives",
    desc: "Memorable scenarios, real-world examples, and chronological context.",
    icon: BookOpen,
  },
  {
    value: LearningStyle.ANALOGIES,
    label: "Analogies & Metaphors",
    desc: "Comparing complex concepts to familiar, everyday experiences.",
    icon: Sparkles,
  },
  {
    value: LearningStyle.FORMULAS,
    label: "Formulas & Logic",
    desc: "Step-by-step mathematical reasoning, axioms, and precise definitions.",
    icon: Binary,
  },
  {
    value: LearningStyle.AUDIO,
    label: "Audio-Style Phrasing",
    desc: "Conversational, lecture-style explanations designed for auditory clarity.",
    icon: Headphones,
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<LearningStyle>(LearningStyle.ANALOGIES);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clientFetch<UserProfile>("/users/me")
      .then((data) => {
        setProfile(data);
        setDisplayName(data.displayName ?? "");
        if (data.learningStyle) setSelectedStyle(data.learningStyle);
      })
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load profile.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    setProfileSaved(false);
    try {
      const updated = await clientFetch<UserProfile>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: displayName.trim(),
          learningStyle: selectedStyle,
        }),
      });
      setProfile(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to save settings.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleExportData() {
    setExporting(true);
    setError(null);
    try {
      const data = await clientFetch<UserDataExport>("/users/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aida-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to export data.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await clientFetch("/users/me", { method: "DELETE" });
      router.push("/register");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to delete account.");
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Settings & Privacy</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your personal profile, preferred explanation style, and data privacy options.
        </p>
      </div>

      {error && <FormError message={error} />}

      <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
        <section className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4">
          <h2 className="font-heading text-lg font-medium">Profile</h2>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile?.email ?? ""} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">Your account email cannot be changed.</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="e.g. Alex Smith"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <Shield className="size-4 text-brand-600" />
            <span>
              Account Status: {profile?.isMinor ? "Protected Minor Account (COPPA-compliant)" : "Standard Adult Account"}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4">
          <div>
            <h2 className="font-heading text-lg font-medium">Preferred Learning Style</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              The AI Tutor, notes, and quiz feedback will explain concepts using this style.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {LEARNING_STYLES.map(({ value, label, desc, icon: Icon }) => {
              const selected = selectedStyle === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedStyle(value)}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all",
                    selected
                      ? "border-brand-600 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-600/20"
                      : "border-border hover:border-brand-300 hover:bg-accent/40",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("size-4", selected ? "text-brand-600" : "text-muted-foreground")} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save Changes"}
            </Button>
            {profileSaved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-success-600">
                <CheckCircle2 className="size-4" /> Preferences saved
              </span>
            )}
          </div>
        </section>
      </form>

      <section className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-lg font-medium">Data Privacy & GDPR Rights</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            You retain ownership of all your uploaded material and learning history.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border">
          <div>
            <p className="text-sm font-medium">Export Your Data</p>
            <p className="text-xs text-muted-foreground">
              Download a machine-readable JSON copy of your documents, quiz attempts, and tutor chats.
            </p>
          </div>
          <Button variant="outline" onClick={handleExportData} disabled={exporting}>
            <Download className="size-4 mr-1.5" />
            {exporting ? "Exporting…" : "Export Data"}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-sm font-medium text-danger-600">Delete Account & Data</p>
            <p className="text-xs text-muted-foreground">
              Permanently purge your account, uploaded PDFs, audio files, quizzes, and spaced-repetition records.
            </p>
          </div>
          <Button variant="outline" className="border-danger-600/40 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4 mr-1.5" />
            Delete Account
          </Button>
        </div>
      </section>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <div className="flex flex-col gap-4">
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your
              documents, generated notes, and review schedules from our servers.
            </DialogDescription>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? "Deleting…" : "Yes, Delete Everything"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
