import { NextRequest, NextResponse } from "next/server";
import { getAnalysis, listAnalyses } from "@/lib/store";

/** GET /api/analyses?id=... 或 列表 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const item = getAnalysis(id);
    if (!item) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, analysis: item });
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") || 50);
  return NextResponse.json({ ok: true, analyses: listAnalyses(limit) });
}
