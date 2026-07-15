import type { ReactNode } from 'react'

interface KioskLayoutProps {
  title: string
  status: string
  children: ReactNode
}

export function KioskLayout({ title, status, children }: KioskLayoutProps) {
  const statusColor =
    status === 'conectado'
      ? 'bg-emerald-500'
      : status === 'error'
      ? 'bg-rose-500'
      : 'bg-amber-500'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <h1 className="text-xl font-bold tracking-wide">OpenSign Enterprise</h1>
        <div className="flex items-center gap-2 text-sm">
          <span>{title}</span>
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusColor}`} />
        </div>
      </header>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
