import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative overflow-x-clip bg-background">
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  );
}
