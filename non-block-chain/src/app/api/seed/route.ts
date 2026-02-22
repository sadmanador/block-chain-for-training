import { seedDatabase } from "@/lib/seed";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const results = await seedDatabase();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Seed error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Failed to seed database", details: message },
      { status: 500 }
    );
  }
}
