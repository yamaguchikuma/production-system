'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/orders', label: '受注一覧', icon: '📋' },
  { href: '/orders/new', label: '受注登録', icon: '➕' },
  { href: '/process-assign', label: '工程登録', icon: '🔧' },
  { href: '/schedule', label: '作業指示', icon: '📅' },
  { href: '/dashboard', label: '生産管理', icon: '🏭' },
  { href: '/field', label: '現場画面', icon: '📱' },
  { href: '/master', label: 'マスタ登録', icon: '⚙️' },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-1 sticky top-0 z-50 shadow-sm">
      <span className="font-bold text-gray-800 text-sm mr-4 whitespace-nowrap shrink-0">山口熊製作所</span>
      <div className="flex gap-1 overflow-x-auto min-w-0">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href !== '/orders/new')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
