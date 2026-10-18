import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { MaterialsClient } from "@/components/materials-client";

export default function MaterialsPage() {
  return (
    <>
      <TopNav />
      <main id="main-content" tabIndex={-1} className="workspace-main">
        <MaterialsClient />
      </main>
      <Footer />
    </>
  );
}
