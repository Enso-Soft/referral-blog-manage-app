'use client'

import { Lightbulb, Wand2, Send, ArrowRight } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { ScrollReveal } from './ScrollReveal'
import type { TranslationKey } from './translations'

const STUDIO_URL = 'https://studio.ensoft.me/app'

const steps: {
  icon: typeof Lightbulb
  titleKey: TranslationKey
  descKey: TranslationKey
  iconBg: string
}[] = [
  {
    icon: Lightbulb,
    titleKey: 'howitworks.step1.title',
    descKey: 'howitworks.step1.desc',
    iconBg: 'from-violet-500 to-purple-500',
  },
  {
    icon: Wand2,
    titleKey: 'howitworks.step2.title',
    descKey: 'howitworks.step2.desc',
    iconBg: 'from-fuchsia-500 to-pink-500',
  },
  {
    icon: Send,
    titleKey: 'howitworks.step3.title',
    descKey: 'howitworks.step3.desc',
    iconBg: 'from-purple-500 to-fuchsia-500',
  },
]

export function HowItWorksSection() {
  const { t } = useLanguage()

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            {t('howitworks.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('howitworks.subtitle')}
          </p>
        </ScrollReveal>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <ScrollReveal key={step.titleKey} delay={i * 0.12}>
              <div className="relative h-full p-8 rounded-2xl bg-card border border-border shadow-sm">
                {/* Step number */}
                <span className="absolute top-6 right-6 text-5xl font-extrabold text-foreground/5 select-none">
                  {i + 1}
                </span>
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${step.iconBg} text-white mb-5`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {t(step.titleKey)}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t(step.descKey)}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* CTA */}
        <ScrollReveal delay={0.2} className="text-center mt-12">
          <a
            href={STUDIO_URL}
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold text-white bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600 shadow-xl shadow-violet-500/25 hover:shadow-2xl hover:shadow-violet-500/30 transition-all hover:scale-105"
          >
            {t('howitworks.cta')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}
