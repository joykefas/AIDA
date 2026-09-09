import Link from "next/link";
import { PageHeader } from "@/components/marketing/page-header";
import { FileText, CheckCircle2, AlertTriangle, UserX, Scale, CreditCard } from "lucide-react";

export const metadata = {
  title: "Terms of Service | AIDA",
  description:
    "Review our terms of service governing account eligibility, acceptable use, AI educational disclaimers, and service commitments.",
};

const termsSections = [
  {
    icon: CheckCircle2,
    title: "1. Service Description & Eligibility",
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          AIDA provides an artificial-intelligence powered learning companion designed to ingest educational materials (PDFs, lectures, notes), generate topics and flashcards, offer interactive Socratic tutoring, and schedule adaptive spaced-repetition reviews.
        </p>
        <p>
          You must be at least 13 years of age to create an account. If you are between 13 and 17 years old, you represent that you have received parental or legal guardian authorization to use the service in compliance with our Child Privacy policies.
        </p>
      </div>
    ),
  },
  {
    icon: FileText,
    title: "2. Acceptable Use & Intellectual Property",
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          You retain full ownership and intellectual property rights over any original files, notes, and study guides you upload to AIDA. By uploading content, you grant AIDA a limited license solely to process and display the content for your personal study sessions.
        </p>
        <p>
          You agree <strong>not</strong> to:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Upload materials that infringe third-party copyrights or violate institutional academic integrity honor codes.</li>
          <li>Attempt to reverse-engineer, decompile, or extract the underlying model weights or prompt architectures.</li>
          <li>Abuse or overload the API through automated scripts or circumvent configured rate limits.</li>
          <li>Use the AI tutor to generate defamatory, abusive, or unlawful content.</li>
        </ul>
      </div>
    ),
  },
  {
    icon: AlertTriangle,
    title: "3. AI-Generated Content & Educational Disclaimer",
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          AIDA employs advanced large language models (such as Meta Llama 3.3 70B via Cloudflare Workers AI) to generate summaries, quizzes, explanations, and grading evaluations based strictly on your uploaded materials.
        </p>
        <p>
          <strong>Notice:</strong> AI systems can occasionally produce inaccurate explanations, incomplete summaries, or incorrect answer scorings. AIDA is an auxiliary study companion and is <strong>not a substitute for official textbook material, classroom instruction, or authorized academic assessment</strong>. Users are encouraged to verify critical facts and dispute questionable grading evaluations via the in-app dispute flow.
        </p>
      </div>
    ),
  },
  {
    icon: UserX,
    title: "4. Account Termination & Suspension",
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          You may terminate your account at any time directly through the <Link href="/settings" className="text-primary underline hover:opacity-80">Settings page</Link>, which immediately initiates the permanent deletion of your profile, documents, and historical data.
        </p>
        <p>
          AIDA reserves the right to suspend or terminate accounts that breach these Terms, engage in malicious scraping, or violate safety standards, with reasonable notice where feasible.
        </p>
      </div>
    ),
  },
  {
    icon: Scale,
    title: "5. Limitation of Liability & Dispute Resolution",
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          To the maximum extent permitted by applicable law, AIDA is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind, whether express or implied.
        </p>
        <p>
          Under no circumstances shall AIDA or its operators be liable for indirect, punitive, special, or consequential damages resulting from study outcomes, examination grades, or service interruptions. Any legal disputes arising under these Terms shall be resolved through good-faith negotiation prior to any formal dispute resolution proceedings.
        </p>
      </div>
    ),
  },
  {
    icon: CreditCard,
    title: "6. Subscription & Billing (Post-MVP Terms)",
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          During the current beta release, core AIDA features are provided without charge.
        </p>
        <p>
          Should premium or tiered subscription services be introduced in subsequent releases, all pricing, billing terms, trial durations, and cancellation policies will be transparently disclosed before any payment details are required. Subscription cancellations can be executed at any time with no lock-in.
        </p>
      </div>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        title="Terms of Service"
        body="Clear, transparent terms defining your rights, acceptable use, and our service commitments."
      />

      <main className="mx-auto max-w-4xl px-6 mt-12 space-y-10">
        <div className="rounded-xl border border-border/80 bg-card p-6 text-sm text-muted-foreground shadow-sm">
          <p>
            <strong>Effective Date:</strong> September 2026. By accessing or using AIDA, you agree to be bound by these Terms. If you do not agree, please do not use the platform.
          </p>
        </div>

        <div className="space-y-8">
          {termsSections.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <section key={idx} className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-heading font-semibold text-foreground">
                    {sec.title}
                  </h2>
                </div>
                {sec.content}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
