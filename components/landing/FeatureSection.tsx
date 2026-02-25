'use client'

import { PenTool, ImagePlus, Scissors, BookOpen } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { ScrollReveal } from './ScrollReveal'
import type { TranslationKey } from './translations'

const features: {
  icon: typeof PenTool
  titleKey: TranslationKey
  descKey: TranslationKey
  subKeys: TranslationKey[]
  gradient: string
  iconBg: string
}[] = [
  {
    icon: PenTool,
    titleKey: 'features.blog.title',
    descKey: 'features.blog.desc',
    subKeys: ['features.blog.sub1', 'features.blog.sub2', 'features.blog.sub3', 'features.blog.sub4'],
    gradient: 'from-violet-500/10 to-purple-500/5 dark:from-violet-500/5 dark:to-purple-500/5',
    iconBg: 'from-violet-500 to-purple-500',
  },
  {
    icon: ImagePlus,
    titleKey: 'features.thumbnail.title',
    descKey: 'features.thumbnail.desc',
    subKeys: ['features.thumbnail.sub1', 'features.thumbnail.sub2', 'features.thumbnail.sub3'],
    gradient: 'from-pink-500/10 to-rose-500/5 dark:from-pink-500/5 dark:to-rose-500/5',
    iconBg: 'from-pink-500 to-rose-500',
  },
  {
    icon: Scissors,
    titleKey: 'features.hair.title',
    descKey: 'features.hair.desc',
    subKeys: ['features.hair.sub1', 'features.hair.sub2', 'features.hair.sub3', 'features.hair.sub4'],
    gradient: 'from-amber-500/10 to-orange-500/5 dark:from-amber-500/5 dark:to-orange-500/5',
    iconBg: 'from-amber-500 to-orange-500',
  },
  {
    icon: BookOpen,
    titleKey: 'features.fairytale.title',
    descKey: 'features.fairytale.desc',
    subKeys: ['features.fairytale.sub1', 'features.fairytale.sub2', 'features.fairytale.sub3', 'features.fairytale.sub4'],
    gradient: 'from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/5 dark:to-teal-500/5',
    iconBg: 'from-emerald-500 to-teal-500',
  },
]

export function FeatureSection() {
  const { t } = useLanguage()

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            {t('features.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>
        </ScrollReveal>

        {/* Feature cards — 2x2 grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <ScrollReveal key={feature.titleKey} delay={i * 0.1}>
              <div className={`group relative p-7 rounded-2xl bg-gradient-to-br ${feature.gradient} border border-border hover:border-violet-300 dark:hover:border-violet-700 shadow-sm hover:shadow-lg transition-all duration-300 h-full`}>
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.iconBg} text-white mb-5`}>
                  <feature.icon className="w-6 h-6" />
                </div>

                {/* Title + main desc */}
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-muted-foreground font-medium mb-4">
                  {t(feature.descKey)}
                </p>

                {/* Sub points */}
                <ul className="space-y-2">
                  {feature.subKeys.map((key) => (
                    <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-50" />
                      {t(key)}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
