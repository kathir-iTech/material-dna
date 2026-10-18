import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { MigrationClient } from "@/components/migration-client";

export default function MigratePage() {
  return (
    <>
      <TopNav />
      <main id="main-content" tabIndex={-1} className="workspace-main">
        <MigrationClient />
      </main>
      <Footer />
    </>
  );
}
