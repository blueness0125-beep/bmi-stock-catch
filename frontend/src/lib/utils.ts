import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKRW(value: number): string {
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}조`
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(0)}억`
  return value.toLocaleString('ko-KR') + '원'
}

export function formatPrice(value: number): string {
  return value.toLocaleString('ko-KR') + '원'
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`
}

export function gradeColor(grade: string): string {
  if (grade === 'A') return 'text-emerald-400'
  if (grade === 'B') return 'text-amber-400'
  return 'text-slate-400'
}

export function gradeBg(grade: string): string {
  if (grade === 'A') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  if (grade === 'B') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
}

export function outcomeColor(outcome: string): string {
  if (outcome === 'TARGET_HIT') return 'text-emerald-400'
  if (outcome === 'STOP_HIT') return 'text-rose-400'
  return 'text-slate-400'
}

export function scoreTotal(score: { total: number } | number): number {
  return typeof score === 'number' ? score : score.total
}
