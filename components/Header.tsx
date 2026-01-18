'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { signOut } from '@/lib/auth'
import {
  LogOut,
  User,
  Shield,
  Settings,
  Package,
  LayoutDashboard,
  Menu,
  X,
  ChevronRight,
  BookOpen
} from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export function Header() {
  const { user, userProfile, loading, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [dateTime, setDateTime] = useState<string | null>(null)

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    setDateTime(new Date().toString());
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
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

  const NavLink = ({ href, icon: Icon, children, active }: { href: string; icon?: any; children: React.ReactNode; active?: boolean }) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
        active
          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{children}</span>
    </Link>
  )

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
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/" icon={BookOpen} active={pathname === '/'}>블로그</NavLink>
            <NavLink href="/products" icon={Package} active={pathname === '/products'}>제품</NavLink>
            {isAdmin && (
              <NavLink href="/admin" icon={LayoutDashboard} active={pathname === '/admin'}>관리자</NavLink>
            )}
          </div>
        )}

        {/* Right Section (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {!loading && (
            user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-border/40">
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
                  <button className="w-8 h-8 rounded-full bg-secondary overflow-hidden border border-border ring-offset-background transition-all hover:ring-2 hover:ring-ring hover:ring-offset-2">
                    <User className="w-full h-full p-1.5 text-muted-foreground" />
                  </button>

                  {/* Dropdown Menu (Simple hover for demo) */}
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border/40 bg-popover/80 backdrop-blur-lg shadow-lg p-1 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all transform origin-top-right scale-95 group-hover:scale-100">
                    <div className="space-y-1">
                      <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-secondary/50">
                        <Settings className="w-4 h-4" /> 설정
                      </Link>
                      <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive rounded-lg hover:bg-destructive/10">
                        <LogOut className="w-4 h-4" /> 로그아웃
                      </button>
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
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
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
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-destructive font-medium rounded-xl hover:bg-destructive/10"
                    >
                      <LogOut className="w-4 h-4" /> 로그아웃
                    </button>
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
