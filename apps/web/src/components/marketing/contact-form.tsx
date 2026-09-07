"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { clientFetch, ApiClientError } from "@/lib/api-client";
import type { CreateContactRequest } from "@aida/shared";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      await clientFetch<{ ok: true }>("/contact", {
        method: "POST",
        body: JSON.stringify({ name, email, message } satisfies CreateContactRequest),
      });
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Try again.");
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
        <CheckCircle2 className="size-8 text-success-600" />
        <p className="font-medium">Message sent.</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          We read every message. If it needs a reply, we&apos;ll get back to you at the email you gave.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-name">Name</Label>
        <Input id="contact-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@school.edu"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-message">Message</Label>
        <textarea
          id="contact-message"
          required
          minLength={1}
          maxLength={4000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What's on your mind?"
          className="min-h-36 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {error && <FormError message={error} />}
      <Button type="submit" disabled={status === "sending"} className="self-start">
        {status === "sending" ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
