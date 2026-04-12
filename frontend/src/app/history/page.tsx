import { api } from "@/lib/api"
import HistoryClient from "./HistoryClient"

export const revalidate = 60

export default async function HistoryPage() {
  const datesRes = await api.dates().catch(() => ({ dates: [], count: 0 }))
  return <HistoryClient initialDates={datesRes.dates} />
}
