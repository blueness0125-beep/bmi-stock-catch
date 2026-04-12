import { api } from "@/lib/api"
import PerformanceClient from "./PerformanceClient"

export const revalidate = 120

export default async function PerformancePage() {
  const data = await api.cumulative(1).catch(() => null)
  return <PerformanceClient initialData={data} />
}
