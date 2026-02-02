import { MainLayout } from "@/components/layout/MainLayout";
import { NewListing } from "@/components/pages/NewListing";

// Force dynamic rendering - this page requires authentication
export const dynamic = "force-dynamic";

export default function NewListingPage() {
  return (
    <MainLayout>
      <NewListing />
    </MainLayout>
  );
}
