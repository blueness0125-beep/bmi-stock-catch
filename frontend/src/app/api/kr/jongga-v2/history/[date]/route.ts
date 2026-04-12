import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params
  if (!/^\d{8}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYYMMDD." }, { status: 400 })
  }
  try {
    const filePath = join(process.cwd(), "public", "data", `jongga_v2_results_${date}.json`)
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: `No data for date ${date}` }, { status: 404 })
    }
    const data = JSON.parse(readFileSync(filePath, "utf-8"))
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 })
  }
}
