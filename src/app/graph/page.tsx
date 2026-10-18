import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { GraphClient } from "@/components/graph-client";
import { ClusteringPanel } from "@/components/clustering-panel";

export default function GraphPage() {
  return (
    <>
      <TopNav />
      <main id="main-content" tabIndex={-1} className="workspace-main">
        <GraphClient />
        <div className="mt-6">
          <ClusteringPanel />
        </div>
      </main>
      <Footer />
    </>
  );
}
