import Link from "next/link";
import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { PageHeading } from "@/components/page-heading";

export default function NotFound() {
  return (
    <>
      <TopNav />
      <main id="main-content" tabIndex={-1} className="workspace-main">
        <PageHeading
          eyebrow="404"
          title="This page could not be found"
          description="The address may have changed. Return to the workspace to continue your review."
        />
        <Link className="primary-action" href="/">
          Return to Resolve
        </Link>
      </main>
      <Footer />
    </>
  );
}
