import { NextResponse } from "next/server";
import { seededReviewCases } from "@/data/demo";

export async function GET() {
  return NextResponse.json({
    reviews: seededReviewCases,
    count: seededReviewCases.length,
  });
}