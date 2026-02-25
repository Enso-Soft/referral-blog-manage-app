'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Zap, Gift } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { ScrollReveal } from './ScrollReveal'
import { CounterAnimation } from './CounterAnimation'
import type { CreditConfig } from './LandingPage'

const STUDIO_URL = 'https://studio.ensoft.me'

const ENSO_SOFT_CHARS = ['E', 'n', 's', 'o', ' ', 'S', 'o', 'f', 't']

export function PricingSection({ creditConfig }: { creditConfig: CreditConfig }) {
  const { t } = useLanguage()
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 0.5', 'end start'],
  })

  // E (index 0) flies to the left card
  const eX = useTransform(scrollYProgress, [0.05, 0.25], [0, -200])
  const eY = useTransform(scrollYProgress, [0.05, 0.25], [0, 120])
  const eScale = useTransform(scrollYProgress, [0.05, 0.25], [1, 1.5])
  const eOpacity = useTransform(scrollYProgress, [0.2, 0.3], [1, 0])

  // S (index 5) flies to the right card
  const sX = useTransform(scrollYProgress, [0.05, 0.25], [0, 200])
  const sY = useTransform(scrollYProgress, [0.05, 0.25], [0, 120])
  const sScale = useTransform(scrollYProgress, [0.05, 0.25], [1, 1.5])
  const sOpacity = useTransform(scrollYProgress, [0.2, 0.3], [1, 0])

  // Other chars fade out
  const otherOpacity = useTransform(scrollYProgress, [0.05, 0.2], [1, 0])

  // Cards fade in
  const cardsOpacity = useTransform(scrollYProgress, [0.15, 0.3], [0, 1])
  const cardsY = useTransform(scrollYProgress, [0.15, 0.3], [40, 0])

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <ScrollReveal className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('pricing.subtitle')}
          </p>
        </ScrollReveal>

        {/* Animated "Enso Soft" text */}
        <div className="flex justify-center items-center text-5xl sm:text-7xl font-extrabold mb-12 h-24">
          {ENSO_SOFT_CHARS.map((char, i) => {
            if (char === ' ') {
              return <motion.span key={i} style={{ opacity: otherOpacity }} className="w-4" />
            }
            if (i === 0) {
              // E
              return (
                <motion.span
                  key={i}
                  style={{ x: eX, y: eY, scale: eScale, opacity: eOpacity }}
                  className="inline-block bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent"
                >
                  {char}
                </motion.span>
              )
            }
            if (i === 5) {
              // S
              return (
                <motion.span
                  key={i}
                  style={{ x: sX, y: sY, scale: sScale, opacity: sOpacity }}
                  className="inline-block bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent"
                >
                  {char}
                </motion.span>
              )
            }
            return (
              <motion.span
                key={i}
                style={{ opacity: otherOpacity }}
                className="inline-block text-foreground"
              >
                {char}
              </motion.span>
            )
          })}
        </div>

        {/* Credit cards */}
        <motion.div
          style={{ opacity: cardsOpacity, y: cardsY }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* E'Credit Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 p-8 text-white shadow-2xl shadow-violet-500/20">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5" />
                <span className="text-sm font-medium text-white/80">{t('pricing.ecredit.type')}</span>
              </div>
              <h3 className="text-3xl font-extrabold mb-1">{t('pricing.ecredit.name')}</h3>
              <p className="text-white/80 mb-6">{t('pricing.ecredit.desc')}</p>

              <div className="bg-white/15 rounded-2xl p-4">
                <div className="text-2xl font-bold">{t('pricing.ecredit.price')}</div>
              </div>
            </div>
          </div>

          {/* S'Credit Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white shadow-2xl shadow-emerald-500/20">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-5 h-5" />
                <span className="text-sm font-medium text-white/80">{t('pricing.scredit.type')}</span>
              </div>
              <h3 className="text-3xl font-extrabold mb-1">{t('pricing.scredit.name')}</h3>
              <p className="text-white/80 mb-6">{t('pricing.scredit.desc')}</p>

              <div className="space-y-3 mb-6">
                <div className="bg-white/15 rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-white/90">{t('pricing.scredit.signup')}</span>
                  <span className="flex items-baseline gap-1.5">
                    <CounterAnimation target={creditConfig.signupGrantAmount} className="text-2xl font-bold" />
                    <span className="text-sm font-medium text-white/70">S&apos;Credit</span>
                  </span>
                </div>
                <div className="bg-white/15 rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-white/90">{t('pricing.scredit.daily')}</span>
                  <span className="flex items-baseline gap-1.5">
                    <CounterAnimation target={creditConfig.checkinGrantAmount} duration={1} className="text-2xl font-bold" />
                    <span className="text-sm font-medium text-white/70">S&apos;Credit</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
