import { PageHeader } from "@/components/marketing/page-header";
import { Trust } from "@/components/marketing/trust";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata = {
  title: "Trust and privacy",
  description: "How AIDA handles your material and your data, especially for the under-18 users this product is built for from day one.",
};

export default function TrustPage() {
  return (
    <>
      <PageHeader
        title="Worth trusting with your material"
        body="A general-purpose study tool attracts a lot of under-18 users. That shaped how data is handled here from the first line of code, not as a policy added later."
      />
      <Trust />
      <FinalCta />
    </>
  );
}
