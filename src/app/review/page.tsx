import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ReviewClient } from "@/components/review-client";

export default function ReviewPage() {
  return (
    <>
      <TopNav />
      <main id="main-content" tabIndex={-1} className="workspace-main">
        <ReviewClient />
      </main>
      <Footer />
    </>
  );
}
