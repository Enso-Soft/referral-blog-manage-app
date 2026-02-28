'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, memo } from 'react'
import { useAuth } from './AuthProvider'
import { useCredit } from '@/context/CreditContext'
import { signOut } from '@/lib/auth'
import {
  LogOut,
  User,
  Settings,
  Package,
  LayoutDashboard,
  Menu,
  X,
  ChevronRight,
  BookOpen,
  Coins,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'
import { cn, throttle } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditPopover } from '@/components/credit/CreditPopover'

// NavLink를 외부로 분리하여 메모이제이션
const NavLink = memo(function NavLink({
  href,
  icon: Icon,
  children,
  active
}: {
  href: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
        active
          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-white"
          : "text-muted-foreground dark:text-slate-300 hover:text-foreground dark:hover:text-white hover:bg-secondary/80"
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{children}</span>
    </Link>
  )
})

export function Header() {
  const { user, userProfile, loading, isAdmin } = useAuth()
  const { totalCredit } = useCredit()
  const router = useRouter()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    // throttle 적용으로 스크롤 이벤트 최적화 (100ms 간격)
    const handleScroll = throttle(() => {
      setIsScrolled(window.scrollY > 10)
    }, 100)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300 border-b",
        isScrolled
          ? "bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-border/40 shadow-sm"
          : "bg-background/0 border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Left Section: Logo & Desktop Navigation */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="font-bold text-primary text-xl">E</span>
            </div>
            <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
              Enso Studio
            </span>
          </Link>

          {/* Desktop Navigation */}
          {!loading && user && (
            <nav aria-label="메인 네비게이션" className="hidden md:flex items-center gap-1">
              <NavLink href="/" icon={BookOpen} active={pathname === '/'}>블로그</NavLink>
              <NavLink href="/products" icon={Package} active={pathname === '/products'}>제품</NavLink>
              <NavLink href="/credits" icon={Coins} active={pathname === '/credits'}>크레딧</NavLink>
              {isAdmin && (
                <NavLink href="/admin" icon={LayoutDashboard} active={pathname === '/admin'}>관리자</NavLink>
              )}
            </nav>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {!loading && (
              user ? (
                <div className="flex items-center gap-3 pl-3 border-l border-border/40">
                  <CreditPopover />
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium leading-none">
                      {userProfile?.displayName || user.email?.split('@')[0]}
                    </span>
                    {isAdmin && (
                      <span className="text-xs text-muted-foreground mt-1">
                        관리자
                      </span>
                    )}
                  </div>

                  <div className="relative group">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="사용자 메뉴"
                      aria-haspopup="true"
                      className="rounded-full bg-secondary overflow-hidden border border-border ring-offset-background hover:ring-2 hover:ring-ring hover:ring-offset-2"
                    >
                      <User className="size-5 text-muted-foreground" />
                    </Button>

                    {/* Dropdown Menu */}
                    <div role="menu" className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border/40 bg-popover/80 backdrop-blur-lg shadow-lg p-1 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all transform origin-top-right scale-95 group-hover:scale-100">
                      <div className="space-y-1">
                        <Link href="/settings" role="menuitem" className="flex items-center gap-2 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-secondary/50">
                          <Settings className="w-4 h-4" /> 설정
                        </Link>
                        <Button variant="ghost" role="menuitem" onClick={handleSignOut} className="w-full justify-start px-3 py-2 h-auto text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <LogOut className="w-4 h-4" /> 로그아웃
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link href="/auth/login" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25">
                  로그인
                </Link>
              )
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-4">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={isMobileMenuOpen}
              className="-mr-2 text-muted-foreground hover:text-foreground"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {!loading && user ? (
                <>
                  <div className="flex items-center gap-3 px-2 mb-6">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{userProfile?.displayName || user.email}</p>
                      {isAdmin && <p className="text-sm text-muted-foreground">관리자</p>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link href="/" className="flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/50">
                      <span className="font-medium">블로그</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                    <Link href="/products" className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary/50">
                      <span className="font-medium">제품 관리</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                    <Link href="/credits" className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary/50">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-500" />
                        <span className="font-medium">{totalCredit.toLocaleString()} Credit</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary/50">
                        <span className="font-medium">관리자 대시보드</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    )}
                    <Link href="/settings" className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary/50">
                      <span className="font-medium">설정</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border/40">
                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="w-full h-auto py-3 text-destructive font-medium rounded-xl hover:bg-destructive/10 hover:text-destructive"
                    >
                      <LogOut className="w-4 h-4" /> 로그아웃
                    </Button>
                  </div>
                </>
              ) : (
                <div className="grid gap-2">
                  <Link href="/auth/login" className="flex items-center justify-center px-4 py-3 font-medium text-primary-foreground bg-primary rounded-xl">
                    로그인
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
