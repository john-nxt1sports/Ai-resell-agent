import { MainLayout } from "@/components/layout/MainLayout";
import { BulkListing } from "@/components/pages/BulkListing";

// Force dynamic rendering - this page requires authentication
export const dynamic = "force-dynamic";

export default function BulkListingPage() {
  return (
    <MainLayout>
      <BulkListing />
    </MainLayout>
  );
}
