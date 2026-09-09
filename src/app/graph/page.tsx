import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GraphClient } from "@/components/graph-client";

export default function GraphPage() {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <GraphClient />
      </main>
      <Footer />
    </>
  );
}