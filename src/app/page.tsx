import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ResolveClient } from "@/components/resolve-client";

export default function HomePage() {
  return (
    <>
      <TopNav />
      <main id="main-content" tabIndex={-1} className="workspace-main">
        <ResolveClient />
      </main>
      <Footer />
    </>
  );
}
