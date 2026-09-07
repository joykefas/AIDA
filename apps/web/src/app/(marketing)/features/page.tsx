import { PageHeader } from "@/components/marketing/page-header";
import { Features } from "@/components/marketing/features";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata = {
  title: "Features",
  description: "Everything AIDA does with your material: notes, mind maps, a grounded tutor, grading, and a review schedule.",
};

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        title="Not another point solution"
        body="Quizlet makes flashcards. Notion AI summarizes. ChatGPT answers questions with no memory of your course. AIDA connects all of it to your actual material."
      />
      <Features />
      <FinalCta />
    </>
  );
}
