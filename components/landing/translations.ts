export type Language = 'ko' | 'en'

const ko = {
  // Header
  'header.cta': '시작하기',
  'header.lang.ko': '한국어',
  'header.lang.en': 'English',

  // Hero
  'hero.tagline': '올인원 크리에이션 플랫폼',
  'hero.title': '단 한 줄, 떠올리기만 하세요.\n상상이 현실이 됩니다.',
  'hero.subtitle': '블로그, 이미지, 동화책부터 아직 상상 못한 것까지.\nAI가 당신의 아이디어를 현실로 바꿔드립니다.',
  'hero.cta': '무료로 시작하기',
  'hero.cta.sub': '가입 즉시 10,000 크레딧 제공',

  // Features
  'features.title': '이런 것들을 만들어 드립니다',
  'features.subtitle': '복잡한 과정 없이, 결과물만 받아보세요',
  'features.blog.title': '블로그, 생각만 하면 완성',
  'features.blog.desc': '떠올린 순간, 이미 절반은 완성입니다. 나머지는 저희가 채워드립니다.',
  'features.blog.sub1': 'YouTube·Google·네이버·다음 등 크로스 리서치로 고품질 콘텐츠 생성',
  'features.blog.sub2': 'SEO 키워드 분석으로 검색 상위 노출 최적화',
  'features.blog.sub3': '워드프레스·구글 블로거·Threads 자동 발행, 네이버·티스토리 맞춤 발행 툴 제공',
  'features.blog.sub4': '쿠팡 파트너스·네이버 커넥트 제휴 마케팅 지원',
  'features.thumbnail.title': '이미지, 머릿속에만 있던 그림이 현실로',
  'features.thumbnail.desc': '복잡한 설명 필요 없어요. 떠오르는 대로 알려주시면 됩니다.',
  'features.thumbnail.sub1': '시행착오 없이, 원하는 퀄리티를 첫 시도에',
  'features.thumbnail.sub2': '유튜브·블로그·SNS·마케팅 등 용도에 맞는 비율과 스타일',
  'features.thumbnail.sub3': '부족한 설명도 괜찮아요. 하나씩 골라가다 보면 퀄리티가 달라집니다',
  'features.hair.title': '헤어스타일, 고민만 하지 말고 미리 확인',
  'features.hair.desc': '자르기 전에 먼저 확인하세요. 어울리는 모습을 찾아드립니다.',
  'features.hair.sub1': '내 얼굴 그대로, 헤어스타일만 바꿔서 확인',
  'features.hair.sub2': '짧은 머리부터 긴 머리까지, 각 길이별 어울리는 스타일 미리보기',
  'features.hair.sub3': '말로 설명하기 어려운 스타일, 사진 한 장이면 전달 끝',
  'features.hair.sub4': '헤어스타일을 넘어 포즈, 배경까지 자유롭게 바꿔보세요',
  'features.fairytale.title': '동화책, 세상에 하나뿐인 우리 아이 이야기',
  'features.fairytale.desc': '우리 아이의 모습과 상상을 담아, 세상에 없던 동화를 만들어 드립니다.',
  'features.fairytale.sub1': '사진 한 장, 또는 말 한마디면 우리 아이가 주인공',
  'features.fairytale.sub2': '좋아하는 장난감, 우주, 모험까지 이야기 속에 쏙',
  'features.fairytale.sub3': '원하는 목소리와 감정으로 동화를 읽어주는 오디오북까지',
  'features.fairytale.sub4': '완성된 동화는 영상으로, 언제 어디서든 다시 감상',

  // Pricing
  'pricing.title': '크레딧 시스템',
  'pricing.subtitle': '필요한 만큼만 사용하세요',
  'pricing.ecredit.name': "E'Credit",
  'pricing.ecredit.type': '유료 크레딧',
  'pricing.ecredit.price': '₩1,000 = 5,000 E\'Credit',
  'pricing.ecredit.desc': '충전하여 사용하는 프리미엄 크레딧',
  'pricing.ecredit.cta': '충전하기',
  'pricing.scredit.name': "S'Credit",
  'pricing.scredit.type': '무료 크레딧',
  'pricing.scredit.signup': '가입 시',
  'pricing.scredit.daily': '매일 지급',
  'pricing.scredit.desc': '매일 자동으로 충전되는 무료 크레딧',

  // FAQ
  'faq.title': '자주 묻는 질문',
  'faq.q1': 'Enso Soft는 어떤 서비스인가요?',
  'faq.a1': '블로그, 이미지, 헤어스타일 시뮬레이션, 동화책까지 만들 수 있는 크리에이션 플랫폼입니다. 떠오르는 아이디어를 알려주시면, 나머지는 저희가 완성합니다.',
  'faq.q2': '무료로 사용할 수 있나요?',
  'faq.a2': '네, 가입 즉시 S\'Credit이 제공되며 매일 자동 충전됩니다. 무료 크레딧만으로도 주요 기능을 충분히 사용할 수 있습니다.',
  'faq.q3': "E'Credit과 S'Credit의 차이가 뭔가요?",
  'faq.a3': "S'Credit은 매일 무료로 지급되는 크레딧이고, E'Credit은 유료로 충전하는 프리미엄 크레딧입니다. 두 크레딧 모두 동일한 기능에 사용할 수 있습니다.",
  'faq.q4': '어떤 블로그 플랫폼을 지원하나요?',
  'faq.a4': '워드프레스 직접 발행을 지원하며, 티스토리와 네이버 블로그용 HTML 내보내기를 제공합니다. Threads SNS 공유도 가능합니다.',
  'faq.q5': '동화책은 어떻게 만들어지나요?',
  'faq.a5': '아이의 사진이나 특징을 알려주시면, 아이를 닮은 캐릭터가 주인공인 동화를 만들어 드립니다. 완성된 동화는 오디오북과 영상으로도 제공됩니다.',
  'faq.q6': '헤어스타일은 어떻게 사용하나요?',
  'faq.a6': '내 사진과 원하는 헤어스타일 사진을 보내주시면, 내 얼굴에 해당 스타일을 적용한 결과를 확인할 수 있습니다. 포즈나 배경 변경도 가능합니다.',

  // Footer
  'footer.cta': '지금 바로 시작하세요',
  'footer.cta.desc': 'AI와 함께 블로그 콘텐츠를 더 빠르고 효율적으로 만들어보세요.',
  'footer.cta.button': '무료로 시작하기',
  'footer.copyright': '© 2026 Enso Soft. All rights reserved.',
  'footer.terms': '이용약관',
  'footer.privacy': '개인정보처리방침',
} as const

const en = {
  // Header
  'header.cta': 'Get Started',
  'header.lang.ko': '한국어',
  'header.lang.en': 'English',

  // Hero
  'hero.tagline': 'All-in-One Creation Platform',
  'hero.title': 'Just one line. Just imagine it.\nImagination becomes reality.',
  'hero.subtitle': 'From blogs, images, and storybooks to things you haven\u0027t even imagined yet.\nAI turns your ideas into reality.',
  'hero.cta': 'Start for Free',
  'hero.cta.sub': '10,000 credits on sign-up',

  // Features
  'features.title': "Here's what we create for you",
  'features.subtitle': 'No complicated steps — just get the results',
  'features.blog.title': 'Blogging, Done Before You Know It',
  'features.blog.desc': 'The moment you think of it, half the work is done. We take care of the rest.',
  'features.blog.sub1': 'High-quality content via cross-research on YouTube, Google, Naver & Daum',
  'features.blog.sub2': 'SEO keyword analysis for top search ranking optimization',
  'features.blog.sub3': 'Auto-publish to WordPress, Google Blogger & Threads, plus optimized tools for Naver & Tistory',
  'features.blog.sub4': 'Coupang Partners & Naver Connect affiliate marketing support',
  'features.thumbnail.title': 'Images, Bring What\u0027s in Your Mind to Life',
  'features.thumbnail.desc': 'No complicated descriptions needed. Just tell us what comes to mind.',
  'features.thumbnail.sub1': 'The quality you want, on the first try — no trial and error',
  'features.thumbnail.sub2': 'Optimized ratios and styles for YouTube, blogs, SNS, marketing and more',
  'features.thumbnail.sub3': 'Not sure how to describe it? Just pick and choose, and watch the quality transform',
  'features.hair.title': 'Hairstyle, Preview Before You Cut',
  'features.hair.desc': 'See it before you cut it. We\u0027ll find the look that suits you best.',
  'features.hair.sub1': 'Your face stays the same — only the hairstyle changes',
  'features.hair.sub2': 'From short to long, preview styles at every length',
  'features.hair.sub3': 'Hard to explain the style you want? One photo is all it takes',
  'features.hair.sub4': 'Beyond hairstyles — change poses, backgrounds, and more',
  'features.fairytale.title': 'Storybook, A One-of-a-Kind Tale for Your Child',
  'features.fairytale.desc': 'We capture your child\u0027s look and imagination to create a storybook like no other.',
  'features.fairytale.sub1': 'One photo or a few words — your child becomes the hero',
  'features.fairytale.sub2': 'Favorite toys, outer space, adventures — all woven into the story',
  'features.fairytale.sub3': 'An audiobook read in the voice and emotion you choose',
  'features.fairytale.sub4': 'The finished story becomes a video you can watch anytime, anywhere',

  // Pricing
  'pricing.title': 'Credit System',
  'pricing.subtitle': 'Pay only for what you use',
  'pricing.ecredit.name': "E'Credit",
  'pricing.ecredit.type': 'Paid Credit',
  'pricing.ecredit.price': '₩1,000 = 5,000 E\'Credit',
  'pricing.ecredit.desc': 'Premium credits you purchase and use',
  'pricing.ecredit.cta': 'Buy Credits',
  'pricing.scredit.name': "S'Credit",
  'pricing.scredit.type': 'Free Credit',
  'pricing.scredit.signup': 'On sign-up',
  'pricing.scredit.daily': 'Daily',
  'pricing.scredit.desc': 'Free credits that recharge automatically every day',

  // FAQ
  'faq.title': 'Frequently Asked Questions',
  'faq.q1': 'What is Enso Soft?',
  'faq.a1': 'Enso Soft is a creation platform where you can create blogs, images, hairstyle simulations, and storybooks. Just share your idea, and we handle the rest.',
  'faq.q2': 'Can I use it for free?',
  'faq.a2': "Yes, you get S'Credits immediately on sign-up with daily auto-recharges. Free credits are sufficient for all core features.",
  'faq.q3': "What's the difference between E'Credit and S'Credit?",
  'faq.a3': "S'Credits are free daily credits, while E'Credits are premium credits you purchase. Both can be used for the same features.",
  'faq.q4': 'Which blog platforms are supported?',
  'faq.a4': 'We support direct WordPress publishing, HTML export for Tistory and Naver blogs, and Threads SNS sharing.',
  'faq.q5': 'How are storybooks created?',
  'faq.a5': 'Share your child\u0027s photo or describe their features, and we create a storybook with a character that looks like them as the hero. Finished stories are also available as audiobooks and videos.',
  'faq.q6': 'How does the hairstyle feature work?',
  'faq.a6': 'Send your photo along with the hairstyle you want, and see the style applied to your face. You can also change poses and backgrounds.',

  // Footer
  'footer.cta': 'Get Started Now',
  'footer.cta.desc': 'Create blog content faster and more efficiently with AI.',
  'footer.cta.button': 'Start for Free',
  'footer.copyright': '© 2026 Enso Soft. All rights reserved.',
  'footer.terms': 'Terms of Service',
  'footer.privacy': 'Privacy Policy',
} as const

export type TranslationKey = keyof typeof ko

export const translations: Record<Language, Record<TranslationKey, string>> = { ko, en }
