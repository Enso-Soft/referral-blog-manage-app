'use client'

import { ArrowRight, Check } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { ScrollReveal } from './ScrollReveal'
import { ImageSlot } from './ImageSlot'
import type { TranslationKey } from './translations'

const STUDIO_URL = 'https://studio.ensoft.me/app'

const items: {
  titleKey: TranslationKey
  descKey: TranslationKey
  labelKey: TranslationKey
  /** 실제 이미지 경로 (추후 /public/landing/ 에 추가 후 지정) */
  src?: string
}[] = [
  {
    titleKey: 'showcase.item1.title',
    descKey: 'showcase.item1.desc',
    labelKey: 'showcase.item1.label',
  },
  {
    titleKey: 'showcase.item2.title',
    descKey: 'showcase.item2.desc',
    labelKey: 'showcase.item2.label',
  },
  {
    titleKey: 'showcase.item3.title',
    descKey: 'showcase.item3.desc',
    labelKey: 'showcase.item3.label',
  },
]

export function ShowcaseSection() {
  const { t } = useLanguage()

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            {t('showcase.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('showcase.subtitle')}
          </p>
        </ScrollReveal>

        {/* Alternating rows */}
        <div className="space-y-16 sm:space-y-24">
          {items.map((item, i) => {
            const reversed = i % 2 === 1
            return (
              <div
                key={item.titleKey}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center"
              >
                {/* Text */}
                <ScrollReveal
                  direction={reversed ? 'left' : 'right'}
                  className={reversed ? 'lg:order-2' : ''}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                      <Check className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                    {t(item.titleKey)}
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {t(item.descKey)}
                  </p>
                </ScrollReveal>

                {/* Image slot */}
                <ScrollReveal
                  direction={reversed ? 'right' : 'left'}
                  delay={0.1}
                  className={reversed ? 'lg:order-1' : ''}
                >
                  <ImageSlot
                    src={item.src}
                    alt={t(item.titleKey)}
                    label={t(item.labelKey)}
                  />
                </ScrollReveal>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <ScrollReveal delay={0.1} className="text-center mt-16">
          <a
            href={STUDIO_URL}
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold text-white bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600 shadow-xl shadow-violet-500/25 hover:shadow-2xl hover:shadow-violet-500/30 transition-all hover:scale-105"
          >
            {t('showcase.cta')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}
