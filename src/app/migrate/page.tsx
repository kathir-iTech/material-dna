import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { MigrationClient } from "@/components/migration-client";

export default function MigratePage() {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <MigrationClient />
      </main>
      <Footer />
    </>
  );
}
