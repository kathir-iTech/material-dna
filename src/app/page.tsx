import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ResolveClient } from "@/components/resolve-client";

export default function HomePage() {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <ResolveClient />
      </main>
      <Footer />
    </>
  );
}