import Link from "next/link";
import { PageHeader } from "@/components/marketing/page-header";
import { ShieldCheck, Lock, Eye, Trash2, Clock, UserCheck, RefreshCw, Mail } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | AIDA",
  description:
    "Our privacy policy outlines what data we collect, why we collect it, how AI processing works, and how your data is protected.",
};

const sections = [
  {
    icon: Eye,
    title: "1. What We Collect",
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          We only collect information necessary to deliver AIDA’s educational features:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account Data:</strong> Your name, email address, password hash, and age bracket provided at signup.</li>
          <li><strong>Study Materials:</strong> PDFs, lecture audio, YouTube links, and notes you explicitly upload.</li>
          <li><strong>Interaction History:</strong> AI tutor conversations, quiz attempts, ratings, question disputes, and spaced-repetition schedules.</li>
          <li><strong>Technical Diagnostics:</strong> Minimal operational logs to maintain service uptime and prevent abuse.</li>
        </ul>
      </div>
    ),
  },
  {
    icon: RefreshCw,
    title: "2. Why We Collect It",
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          Every piece of data collected serves a direct educational function:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Extracting concepts and generating structured study topics from your course material.</li>
          <li>Powering conversational Socratic tutoring grounded strictly in your syllabus.</li>
          <li>Evaluating written quiz and exam answers with actionable, formative feedback.</li>
          <li>Scheduling spaced-repetition reviews before memory decay occurs.</li>
        </ul>
      </div>
    ),
  },
  {
    icon: Lock,
    title: "3. Third-Party AI Processors & Subprocessors",
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          We believe in complete transparency regarding AI processing:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Groq & Cloudflare Workers AI:</strong> We utilize Groq API (running Meta Llama 3.3 70B and Whisper) with Cloudflare Workers AI automated backup for topic extraction, quiz generation, tutoring, and grading, as well as audio transcription.</li>
          <li><strong>Zero Model Training:</strong> Your uploaded documents, lecture recordings, and private questions are <strong>never</strong> used to train or fine-tune public AI foundation models.</li>
          <li><strong>Cloud Storage:</strong> Encrypted object storage (S3/R2-compatible) stores uploaded media under strict private access controls.</li>
        </ul>
      </div>
    ),
  },
  {
    icon: Clock,
    title: "4. Data Retention & Erasure",
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          Your study materials and history are retained only for as long as your account exists:
        </p>
        <p>
          You may delete individual files or topics at any time. When an account deletion is initiated via Account Settings, all associated personal data, uploaded documents, audio transcriptions, and interaction logs are permanently purged from active databases within 30 days.
        </p>
      </div>
    ),
  },
  {
    icon: UserCheck,
    title: "5. Minors & Child Privacy (COPPA Compliance)",
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          Because students frequently include minors, privacy protections are built in from day one:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Age Verification:</strong> An age-gate is enforced during registration. Users under 13 require verified parental consent before account activation.</li>
          <li><strong>Restricted Tracking:</strong> Minor accounts (ages 13–17) are flagged in our database, permanently disabling behavioral analytics, third-party advertising pixels, and cross-platform tracking.</li>
        </ul>
      </div>
    ),
  },
  {
    icon: Trash2,
    title: "6. Your Rights & In-App Data Controls (GDPR / CCPA)",
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          Regardless of your physical location, AIDA provides full self-service data rights:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Data Portability / Export:</strong> Download a complete JSON archive of your topics, quiz scores, and account records directly from your <Link href="/settings" className="text-primary underline hover:opacity-80">Settings page</Link>.</li>
          <li><strong>Right to Rectification:</strong> Update your profile and email credentials at any time.</li>
          <li><strong>Right to Deletion:</strong> Permanently delete your entire account and associated storage with a single confirmation.</li>
          <li><strong>Dispute Resolution:</strong> If an AI grading assessment is inaccurate, you can flag it directly inside the quiz interface for human audit.</li>
        </ul>
      </div>
    ),
  },
  {
    icon: ShieldCheck,
    title: "7. Security & Encryption",
    content: (
      <p className="text-muted-foreground">
        All communications with AIDA are protected via TLS 1.3 encryption in transit. Uploaded documents, vector embeddings, and database tables are protected with AES-256 encryption at rest. Internal system access adheres to the principle of least privilege, protected by role-based authorization and immutable audit logs.
      </p>
    ),
  },
  {
    icon: Mail,
    title: "8. Contact & Privacy Requests",
    content: (
      <p className="text-muted-foreground">
        If you have questions regarding this Privacy Policy, wish to exercise your statutory privacy rights, or need assistance with parental consent, please contact our data privacy team at{" "}
        <a href="mailto:privacy@aida.study" className="text-primary underline hover:opacity-80">
          privacy@aida.study
        </a>{" "}
        or submit a ticket via our{" "}
        <Link href="/contact" className="text-primary underline hover:opacity-80">
          Contact Form
        </Link>.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        title="Privacy Policy"
        body="How AIDA protects your study materials, processes AI queries, and honors your privacy rights from day one."
      />

      <main className="mx-auto max-w-4xl px-6 mt-12 space-y-10">
        <div className="rounded-xl border border-border/80 bg-card p-6 text-sm text-muted-foreground shadow-sm">
          <p>
            <strong>Last Updated:</strong> September 2026. This policy applies to all web and mobile platforms provided by AIDA. We encourage you to read this policy to understand our zero-data-mining commitment.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((sec, idx) => {
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
