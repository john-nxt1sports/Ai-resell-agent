import { MainLayout } from "@/components/layout/MainLayout";
import { Dashboard } from "@/components/features/Dashboard";

// Force dynamic rendering - this page requires authentication
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <MainLayout>
      <Dashboard />
    </MainLayout>
  );
}
