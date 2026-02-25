'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { TypingEffect } from './TypingEffect'
import { ScrollReveal } from './ScrollReveal'
import type { CreditConfig } from './LandingPage'

const STUDIO_URL = 'https://studio.ensoft.me'

export function HeroSection({ creditConfig }: { creditConfig: CreditConfig }) {
  const { t, lang } = useLanguage()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
    >
      {/* Background gradient */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={{ y: bgY }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 dark:from-violet-950/30 dark:via-fuchsia-950/20 dark:to-background" />
        {/* Decorative blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-400/20 dark:bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-400/20 dark:bg-fuchsia-600/10 rounded-full blur-3xl" />
      </motion.div>

      <motion.div
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        style={{ opacity }}
      >
        {/* Tagline */}
        <ScrollReveal delay={0.1}>
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 mb-6">
            {t('hero.tagline')}
          </span>
        </ScrollReveal>

        {/* Title with typing effect */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-tight mb-6">
          <TypingEffect text={t('hero.title')} speed={60} />
        </h1>

        {/* Subtitle */}
        <ScrollReveal delay={0.4}>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 whitespace-pre-line leading-relaxed">
            {t('hero.subtitle')}
          </p>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal delay={0.6}>
          <div className="flex flex-col items-center gap-3">
            <a
              href={STUDIO_URL}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold text-white bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600 shadow-xl shadow-violet-500/25 hover:shadow-2xl hover:shadow-violet-500/30 transition-all hover:scale-105"
            >
              {t('hero.cta')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <span className="text-sm text-muted-foreground">
              {lang === 'ko'
                ? `가입 즉시 ${creditConfig.signupGrantAmount.toLocaleString()} 크레딧 제공`
                : `${creditConfig.signupGrantAmount.toLocaleString()} credits on sign-up`}
            </span>
          </div>
        </ScrollReveal>
      </motion.div>
    </section>
  )
}
