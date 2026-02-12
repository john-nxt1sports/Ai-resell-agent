import { MainLayout } from "@/components/layout/MainLayout";
import { AllListings } from "@/components/features/AllListings";

// Force dynamic rendering - this page requires authentication
export const dynamic = "force-dynamic";

export default function AllListingsPage() {
  return (
    <MainLayout>
      <AllListings />
    </MainLayout>
  );
}
