import { MainLayout } from "@/components/layout/MainLayout";
import { Settings } from "@/components/pages/Settings";

// Force dynamic rendering - this page requires authentication
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <MainLayout>
      <Settings />
    </MainLayout>
  );
}
