'use client'

import { useLanguage } from './LanguageProvider'
import { ScrollReveal } from './ScrollReveal'
import { CounterAnimation } from './CounterAnimation'
import type { TranslationKey } from './translations'

// NOTE: 아래 통계 수치는 실제 데이터가 아닌 플레이스홀더입니다.
// TODO: 실수치 확보 시 target 값을 교체할 것.
const stats: {
  target: number
  suffixKey: TranslationKey
  labelKey: TranslationKey
}[] = [
  { target: 12000, suffixKey: 'trust.stat1.suffix', labelKey: 'trust.stat1.label' },
  { target: 4, suffixKey: 'trust.stat2.suffix', labelKey: 'trust.stat2.label' },
  { target: 5, suffixKey: 'trust.stat3.suffix', labelKey: 'trust.stat3.label' },
]

// 브랜드명이라 언어 무관 — translations 불필요
const PLATFORMS = ['WordPress', 'Tistory', 'Naver', 'Threads', 'Blogger', 'Coupang']

export function TrustSection() {
  const { t } = useLanguage()

  return (
    <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {t('trust.title')}
          </h2>
        </ScrollReveal>

        {/* Stats */}
        <ScrollReveal className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-16">
          {stats.map((stat) => (
            <div key={stat.labelKey} className="text-center">
              <CounterAnimation
                target={stat.target}
                suffix={t(stat.suffixKey)}
                className="block text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent"
              />
              <span className="mt-2 block text-sm text-muted-foreground">
                {t(stat.labelKey)}
              </span>
            </div>
          ))}
        </ScrollReveal>

        {/* Platform chips */}
        <ScrollReveal delay={0.1} className="text-center">
          <p className="text-sm text-muted-foreground mb-5">
            {t('trust.platforms.label')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {PLATFORMS.map((name) => (
              <span
                key={name}
                className="px-4 py-2 rounded-full bg-card border border-border text-sm font-semibold text-foreground/70 shadow-sm"
              >
                {name}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
