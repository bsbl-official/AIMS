import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AppSidebar } from './layout/AppSidebar'
import { TopHeader } from './layout/TopHeader'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!sidebarOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [sidebarOpen])

  return <div className="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[268px_minmax(0,1fr)]">
    <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    {sidebarOpen && <button className="fixed inset-0 z-30 cursor-default border-0 bg-[rgba(7,24,27,.48)] backdrop-blur-[2px] lg:hidden" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <div className="min-w-0">
      <TopHeader onMenuToggle={() => setSidebarOpen(true)} />
      <main className="w-full px-4 pt-4 pb-8 sm:px-5 sm:pt-5 lg:px-7 lg:pt-6 lg:pb-10 xl:px-9 2xl:px-10">
        <Outlet />
      </main>
    </div>
  </div>
}
