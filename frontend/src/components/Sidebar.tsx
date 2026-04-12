'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, Clock, TrendingUp, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: '대시보드', icon: Activity },
  { href: '/history', label: '히스토리', icon: Clock },
  { href: '/performance', label: '성과분석', icon: TrendingUp },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-[#111111] border-r border-[#222222] flex flex-col z-10">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#222222]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-emerald-500 rounded-md flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-black" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">종가베팅 V2</p>
            <p className="text-[10px] text-slate-500 leading-tight">KR Signal Screener</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-white/5 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/3'
              )}
            >
              <Icon className={cn('w-4 h-4', active ? 'text-emerald-400' : 'text-slate-500')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#222222]">
        <p className="text-[10px] text-slate-600">KOSPI · KOSDAQ</p>
        <p className="text-[10px] text-slate-600">15점 스코어링 시스템</p>
      </div>
    </aside>
  )
}
