import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import ResearchClient from "@/components/research-client";

export default function ResearchPage() {
  return (
    <>
      <TopNav />
      <main id="main-content" tabIndex={-1} className="workspace-main">
        <ResearchClient />
      </main>
      <Footer />
    </>
  );
}
