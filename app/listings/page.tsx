import { MainLayout } from "@/components/layout/MainLayout";
import { AllListings } from "@/components/pages/AllListings";

// Force dynamic rendering - this page requires authentication
export const dynamic = "force-dynamic";

export default function AllListingsPage() {
  return (
    <MainLayout>
      <AllListings />
    </MainLayout>
  );
}
