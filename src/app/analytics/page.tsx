import { MainLayout } from "@/components/layout/MainLayout";
import { Analytics } from "@/components/features/Analytics";

// Force dynamic rendering - this page requires authentication
export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <MainLayout>
      <Analytics />
    </MainLayout>
  );
}
