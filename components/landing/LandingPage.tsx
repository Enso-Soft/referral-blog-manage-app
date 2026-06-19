'use client'

import { useEffect, useState } from 'react'
import { LandingHeader } from './LandingHeader'
import { HeroSection } from './HeroSection'
import { HowItWorksSection } from './HowItWorksSection'
import { FeatureSection } from './FeatureSection'
import { ShowcaseSection } from './ShowcaseSection'
import { TrustSection } from './TrustSection'
import { PricingSection } from './PricingSection'
import { FaqSection } from './FaqSection'
import { FooterSection } from './FooterSection'

export interface CreditConfig {
  signupGrantAmount: number
  checkinGrantAmount: number
  creditPerWon: number
}

const DEFAULT_CONFIG: CreditConfig = {
  signupGrantAmount: 10000,
  checkinGrantAmount: 1000,
  creditPerWon: 5,
}

export function LandingPage() {
  const [creditConfig, setCreditConfig] = useState<CreditConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    fetch('/api/credits/config')
      .then(res => res.json())
      .then(json => {
        if (json.success) setCreditConfig(json.data)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <HeroSection creditConfig={creditConfig} />
      <HowItWorksSection />
      <FeatureSection />
      <ShowcaseSection />
      <TrustSection />
      <PricingSection creditConfig={creditConfig} />
      <FaqSection />
      <FooterSection />
    </div>
  )
}
