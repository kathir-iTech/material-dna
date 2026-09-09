import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import ResearchClient from "@/components/research-client";

export default function ResearchPage() {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <ResearchClient />
      </main>
      <Footer />
    </>
  );
}