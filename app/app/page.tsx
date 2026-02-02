import { redirect } from "next/navigation";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function AppPage() {
  redirect("/dashboard");
}
