import { PageHeader } from "@/components/marketing/page-header";
import { AboutContent } from "@/components/marketing/about-content";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata = {
  title: "About AIDA",
  description: "Why AIDA is built around one connected study loop instead of five separate tools.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader title="One loop, not five tools" />
      <AboutContent />
      <FinalCta />
    </>
  );
}
