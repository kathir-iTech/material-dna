import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ReviewClient } from "@/components/review-client";

export default function ReviewPage() {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <ReviewClient />
      </main>
      <Footer />
    </>
  );
}