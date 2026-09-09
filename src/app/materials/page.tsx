import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { MaterialsClient } from "@/components/materials-client";

export default function MaterialsPage() {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <MaterialsClient />
      </main>
      <Footer />
    </>
  );
}