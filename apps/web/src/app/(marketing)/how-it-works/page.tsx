import { PageHeader } from "@/components/marketing/page-header";
import { HowItWorksLoop } from "@/components/marketing/how-it-works-loop";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata = {
  title: "How AIDA works",
  description: "Upload, understand, practice, get graded, and know what to review next, one connected loop.",
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        title="One connected loop"
        body="Not five separate apps stitched together. Upload once, and everything downstream uses the same material."
      />
      <HowItWorksLoop />
      <FinalCta />
    </>
  );
}
