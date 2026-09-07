import { Hero } from "@/components/marketing/hero";
import { LoopTeaser } from "@/components/marketing/loop-teaser";
import { FeatureHighlight } from "@/components/marketing/feature-highlight";
import { FinalCta } from "@/components/marketing/final-cta";

export default function MarketingPage() {
  return (
    <>
      <Hero />
      <LoopTeaser />
      <FeatureHighlight />
      <FinalCta />
    </>
  );
}
