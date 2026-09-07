import { PageHeader } from "@/components/marketing/page-header";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata = {
  title: "Contact",
  description: "Get in touch with the AIDA team.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader title="Get in touch" body="Questions, feedback, or something broken. This goes straight to the team." />
      <div className="mx-auto max-w-lg px-6 py-16">
        <ContactForm />
      </div>
    </>
  );
}
