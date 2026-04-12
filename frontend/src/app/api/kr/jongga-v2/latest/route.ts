import { readFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function findLatestResultsFile(dataDir: string): string | null {
  const files = readdirSync(dataDir)
    .filter((f) => /^jongga_v2_results_\d{8}\.json$/.test(f))
    .sort()
    .reverse()
  return files.length ? join(dataDir, files[0]) : null
}

export async function GET() {
  try {
    const dataDir = join(process.cwd(), "public", "data")
    let filePath = join(dataDir, "jongga_v2_latest.json")
    if (!existsSync(filePath)) {
      const fallback = findLatestResultsFile(dataDir)
      if (!fallback) return NextResponse.json({ signals: [], message: "No data" })
      filePath = fallback
    }
    const data = JSON.parse(readFileSync(filePath, "utf-8"))
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ signals: [], message: "No data" })
  }
}
