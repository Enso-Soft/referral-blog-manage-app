export type Language = 'ko' | 'en'

const ko = {
  // Header
  'header.cta': '시작하기',
  'header.lang.ko': '한국어',
  'header.lang.en': 'English',

  // Hero
  'hero.tagline': 'AI 블로그 자동 작성',
  'hero.title': '주제 한 줄이면,\n글쓰기부터 발행까지 끝납니다',
  'hero.subtitle': '유튜브·구글·네이버·다음을 한 번에 조사해 정확한 글을 쓰고,\n워드프레스·티스토리·네이버까지 알아서 발행합니다.',
  'hero.cta': '무료로 시작하기',

  // How it works
  'howitworks.title': '이렇게 간단합니다',
  'howitworks.subtitle': '복잡한 설정 없이, 세 단계면 끝',
  'howitworks.step1.title': '주제만 입력하세요',
  'howitworks.step1.desc': '쓰고 싶은 주제 한 줄이면 충분합니다. AI가 유튜브·구글·네이버·다음을 조사해 글감을 모읍니다.',
  'howitworks.step2.title': 'AI가 글을 쓰고 다듬습니다',
  'howitworks.step2.desc': '사실 확인을 거쳐 완성도 높은 글을 만듭니다. 마음에 안 들면 대화로 바로 고치세요.',
  'howitworks.step3.title': '버튼 하나로 발행',
  'howitworks.step3.desc': '워드프레스·티스토리·네이버·Threads까지, 원하는 곳에 바로 올립니다.',
  'howitworks.cta': '지금 첫 글 만들어보기',

  // Features
  'features.title': '블로그 운영, 처음부터 끝까지',
  'features.subtitle': '글쓰기부터 편집, 발행, 수익화까지 한 곳에서',
  'features.blog.title': '한 줄이면 글 한 편',
  'features.blog.desc': '주제만 던지면, 사실 확인까지 마친 완성형 글을 받아보세요.',
  'features.blog.sub1': '유튜브·구글·네이버·다음 크로스 리서치로 정확한 콘텐츠',
  'features.blog.sub2': '사실 확인을 거친 신뢰할 수 있는 내용',
  'features.blog.sub3': '초안이 아니라 바로 올릴 수 있는 완성본',
  'features.edit.title': '말하면 그대로 고쳐드려요',
  'features.edit.desc': '마음에 안 드는 부분, 설명만 하면 AI가 바로 다듬습니다.',
  'features.edit.sub1': '채팅하듯 자연스럽게 수정 요청',
  'features.edit.sub2': '문단 추가·말투 변경·길이 조절까지 자유롭게',
  'features.edit.sub3': '내 스타일대로 완성될 때까지',
  'features.publish.title': '쓴 글, 어디든 바로 발행',
  'features.publish.desc': '플랫폼마다 옮겨 붙일 필요 없이, 클릭 한 번으로 올립니다.',
  'features.publish.sub1': '워드프레스 직접 발행, 이미지까지 자동 업로드',
  'features.publish.sub2': '티스토리·네이버 맞춤 발행, 다크모드까지 깔끔하게',
  'features.publish.sub3': 'Threads·구글 블로거 공유',
  'features.publish.sub4': '쿠팡 파트너스·네이버 커넥트 상품 관리, 제휴 문구 자동 삽입',
  'features.visual.title': '글에 어울리는 대표 이미지까지',
  'features.visual.desc': '글만 있으면 허전하죠. 어울리는 대표 이미지를 만들어 드립니다.',
  'features.visual.sub1': '블로그·SNS 비율에 딱 맞는 대표 이미지',
  'features.visual.sub2': '글 분위기에 맞는 스타일 자동 추천',
  'features.visual.sub3': '복잡한 설명 없이 골라가며 완성',

  // Showcase
  'showcase.title': '결과물로 증명합니다',
  'showcase.subtitle': '말보다 직접 보세요',
  'showcase.item1.title': '완성도 높은 글, 바로 확인',
  'showcase.item1.desc': '제목부터 본문, 소제목 구성까지 사람이 쓴 것처럼 자연스럽게.',
  'showcase.item1.label': 'AI가 작성한 블로그 글',
  'showcase.item2.title': '말로 고치는 스마트한 편집',
  'showcase.item2.desc': '원하는 부분을 대화로 요청하면 즉시 반영됩니다.',
  'showcase.item2.label': 'AI 대화형 편집',
  'showcase.item3.title': '클릭 한 번이면 발행 끝',
  'showcase.item3.desc': '여러 플랫폼에 동시에, 이미지까지 자동으로 옮겨집니다.',
  'showcase.item3.label': '다중 플랫폼 발행 화면',
  'showcase.cta': '직접 만들어보기',

  // Trust / social proof
  'trust.title': '이미 블로거들이 선택했습니다',
  'trust.stat1.suffix': '+',
  'trust.stat1.label': '작성된 블로그 글',
  'trust.stat2.suffix': '개 채널',
  'trust.stat2.label': '동시 크로스 리서치',
  'trust.stat3.suffix': '분',
  'trust.stat3.label': '평균 초안 완성 시간',
  'trust.platforms.label': '이런 곳에 바로 발행하세요',

  // Pricing
  'pricing.title': '무료로 시작해서, 필요할 때만 충전',
  'pricing.subtitle': '카드 등록 없이 바로 시작하세요',
  'pricing.ecredit.name': "E'Credit",
  'pricing.ecredit.type': '유료 크레딧',
  'pricing.ecredit.desc': '더 많이 쓰고 싶을 때만 충전하세요',
  'pricing.ecredit.cta': '충전하기',
  'pricing.scredit.name': "S'Credit",
  'pricing.scredit.type': '무료 크레딧',
  'pricing.scredit.signup': '가입 시',
  'pricing.scredit.daily': '매일 지급',
  'pricing.scredit.desc': '가입하면 바로 받고, 매일 자동으로 다시 채워지는 무료 크레딧',
  'pricing.note': '두 크레딧 모두 모든 기능에 사용할 수 있어요. 카드 등록은 충전할 때만 필요합니다.',

  // FAQ
  'faq.title': '자주 묻는 질문',
  'faq.q1': 'Enso Soft는 어떤 서비스인가요?',
  'faq.a1': '주제 한 줄만 입력하면 AI가 조사·작성·편집부터 발행까지 해주는 블로그 자동화 서비스입니다.',
  'faq.q2': '정말 무료로 쓸 수 있나요?',
  'faq.a2': '네. 가입하면 바로 무료 크레딧을 드리고 매일 자동으로 충전됩니다. 카드 등록 없이 시작할 수 있어요.',
  'faq.q3': 'AI가 쓴 글, 수정할 수 있나요?',
  'faq.a3': '네. AI와 대화하면서 원하는 부분을 바로 고칠 수 있어 내 스타일대로 다듬을 수 있습니다.',
  'faq.q4': '어떤 블로그에 발행할 수 있나요?',
  'faq.a4': '워드프레스는 이미지까지 자동으로 직접 발행되고, 티스토리·네이버는 맞춤 발행을 지원합니다. Threads와 구글 블로거 공유도 됩니다.',
  'faq.q5': '글 내용이 정확한가요?',
  'faq.a5': '유튜브·구글·네이버·다음을 함께 조사해 사실 확인을 거친 글을 만들고, 마음에 안 드는 부분은 대화로 바로 수정할 수 있습니다.',
  'faq.q6': '블로그로 수익도 낼 수 있나요?',
  'faq.a6': '쿠팡 파트너스·네이버 커넥트 상품을 관리하고 제휴 문구를 자동으로 넣어줘서 제휴 마케팅에 바로 활용할 수 있습니다.',

  // Footer
  'footer.cta': '지금 첫 블로그 글을 만들어보세요',
  'footer.cta.desc': '주제 한 줄이면 충분합니다. 무료로 시작하고, 카드 등록은 나중에.',
  'footer.cta.button': '무료로 시작하기',
  'footer.copyright': '© 2026 Enso Soft. All rights reserved.',
  'footer.terms': '이용약관',
  'footer.privacy': '개인정보처리방침',
} as const

const en: Record<keyof typeof ko, string> = {
  // Header
  'header.cta': 'Get Started',
  'header.lang.ko': '한국어',
  'header.lang.en': 'English',

  // Hero
  'hero.tagline': 'AI Blog Writing, Automated',
  'hero.title': 'One topic in.\nWritten and published.',
  'hero.subtitle': 'We research YouTube, Google, Naver & Daum at once to write accurate posts,\nthen publish to WordPress, Tistory & Naver for you.',
  'hero.cta': 'Start for Free',

  // How it works
  'howitworks.title': "It's this simple",
  'howitworks.subtitle': 'Three steps, zero setup',
  'howitworks.step1.title': 'Enter a topic',
  'howitworks.step1.desc': 'One line is enough. AI researches YouTube, Google, Naver & Daum to gather the facts.',
  'howitworks.step2.title': 'AI writes & refines',
  'howitworks.step2.desc': 'It produces a polished, fact-checked post. Tweak anything just by chatting.',
  'howitworks.step3.title': 'Publish in one click',
  'howitworks.step3.desc': 'Send it straight to WordPress, Tistory, Naver & Threads.',
  'howitworks.cta': 'Write your first post',

  // Features
  'features.title': 'Everything your blog needs',
  'features.subtitle': 'From writing to editing, publishing, and earning — all in one place',
  'features.blog.title': 'One line becomes a full post',
  'features.blog.desc': 'Drop a topic, get a finished, fact-checked post.',
  'features.blog.sub1': 'Accurate content via cross-research on YouTube, Google, Naver & Daum',
  'features.blog.sub2': 'Fact-checked, trustworthy content you can rely on',
  'features.blog.sub3': 'Not a rough draft — ready to publish',
  'features.edit.title': "Say it, and it's fixed",
  'features.edit.desc': 'Describe what you want changed, and AI refines it instantly.',
  'features.edit.sub1': 'Request edits naturally, like chatting',
  'features.edit.sub2': 'Add paragraphs, change tone, adjust length — freely',
  'features.edit.sub3': 'Until it reads just like you',
  'features.publish.title': 'Publish anywhere, instantly',
  'features.publish.desc': "No copy-pasting between platforms — one click and it's live.",
  'features.publish.sub1': 'Direct WordPress publishing with auto image upload',
  'features.publish.sub2': 'Optimized publishing for Tistory & Naver, dark-mode safe',
  'features.publish.sub3': 'Share to Threads & Google Blogger',
  'features.publish.sub4': 'Coupang Partners & Naver Connect with auto-inserted disclaimers',
  'features.visual.title': 'Cover images, made to match',
  'features.visual.desc': 'A post needs visuals — we generate cover images that fit.',
  'features.visual.sub1': 'Cover images sized for blogs & SNS',
  'features.visual.sub2': "Styles matched to your post's tone",
  'features.visual.sub3': 'No prompt skills needed — just pick and refine',

  // Showcase
  'showcase.title': 'See it for yourself',
  'showcase.subtitle': 'Results speak louder than words',
  'showcase.item1.title': 'Polished posts, instantly',
  'showcase.item1.desc': 'Title, body, and structure that read like a human wrote them.',
  'showcase.item1.label': 'A real AI-written post',
  'showcase.item2.title': 'Smart editing, just by talking',
  'showcase.item2.desc': 'Request a change in plain words and see it applied instantly.',
  'showcase.item2.label': 'AI conversational editing',
  'showcase.item3.title': 'One click to go live',
  'showcase.item3.desc': 'Push to multiple platforms at once — images carried over automatically.',
  'showcase.item3.label': 'Multi-platform publishing',
  'showcase.cta': 'Try it yourself',

  // Trust / social proof
  'trust.title': 'Creators already trust Enso',
  'trust.stat1.suffix': '+',
  'trust.stat1.label': 'posts written',
  'trust.stat2.suffix': ' sources',
  'trust.stat2.label': 'cross-researched',
  'trust.stat3.suffix': ' min',
  'trust.stat3.label': 'avg. draft time',
  'trust.platforms.label': 'Publish directly to',

  // Pricing
  'pricing.title': 'Start free, top up only if you need to',
  'pricing.subtitle': 'No card required to begin',
  'pricing.ecredit.name': "E'Credit",
  'pricing.ecredit.type': 'Paid Credit',
  'pricing.ecredit.desc': 'Top up only when you want more',
  'pricing.ecredit.cta': 'Buy Credits',
  'pricing.scredit.name': "S'Credit",
  'pricing.scredit.type': 'Free Credit',
  'pricing.scredit.signup': 'On sign-up',
  'pricing.scredit.daily': 'Daily',
  'pricing.scredit.desc': 'Free credits the moment you join — refilled automatically every day',
  'pricing.note': 'Both credits work for every feature. A card is only needed when you top up.',

  // FAQ
  'faq.title': 'Frequently Asked Questions',
  'faq.q1': 'What is Enso Soft?',
  'faq.a1': 'An AI blog automation service: enter one topic and it researches, writes, edits, and publishes for you.',
  'faq.q2': 'Is it really free to start?',
  'faq.a2': 'Yes. You get free credits on sign-up, refilled daily, and no card is required to begin.',
  'faq.q3': 'Can I edit what the AI writes?',
  'faq.a3': 'Yes. You can refine any part by chatting with the AI, so it reads just the way you want.',
  'faq.q4': 'Where can I publish?',
  'faq.a4': 'Direct publishing to WordPress (images included), optimized publishing for Tistory & Naver, plus Threads and Google Blogger.',
  'faq.q5': 'How accurate is the content?',
  'faq.a5': 'We cross-research YouTube, Google, Naver & Daum for fact-checked content, and you can fix anything just by chatting.',
  'faq.q6': 'Can I earn from my blog?',
  'faq.a6': 'Manage Coupang Partners & Naver Connect products with auto-inserted disclaimers for affiliate marketing.',

  // Footer
  'footer.cta': 'Write your first post today',
  'footer.cta.desc': 'One topic is all it takes. Start free — add a card later, if ever.',
  'footer.cta.button': 'Start for Free',
  'footer.copyright': '© 2026 Enso Soft. All rights reserved.',
  'footer.terms': 'Terms of Service',
  'footer.privacy': 'Privacy Policy',
}

export type TranslationKey = keyof typeof ko

export const translations: Record<Language, Record<TranslationKey, string>> = { ko, en }
