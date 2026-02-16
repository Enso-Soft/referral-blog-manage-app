/**
 * 3개 블로그 글의 seoAnalysis를 실제 SEO 리포트 기반으로 업데이트
 * 사용법: npx tsx scripts/update-seo-sample.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as admin from 'firebase-admin'

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local')
  const content = fs.readFileSync(envPath, 'utf-8')
  const env: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.substring(0, eqIdx).trim()
    let value = trimmed.substring(eqIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value.replace(/\\n/g, '\n')
  }
  return env
}

const env = loadEnv()

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY,
    }),
  })
}

const db = admin.firestore()

// =====================================================
// 1. 스페이스X 상장 글
// =====================================================
const spaceXSeo = {
  mainKeyword: {
    keyword: '스페이스X 상장',
    monthlyVolume: 152900,
    pcVolume: 28500,
    mobileVolume: 124400,
    competition: 'low',
    serpDifficulty: 46,
    ctr: 0.8,
    adCount: 0,
    recommendation: '즉시 진입 추천',
    reason: '검색량 15만 회로 충분히 높으나 경쟁도가 낮아 진입 가능성 높음. 상위 블로그들의 평균 글자수가 1,790자로 낮아 깊이 있는 분석으로 차별화 가능',
  },
  subKeywords: [
    { keyword: '스타링크', monthlyVolume: 77300, competition: 'medium', serpDifficulty: 46, reason: '독립적 검색 수요 높음, SpaceX IPO 글 내에서 수익 구조 설명 시 SEO 시너지' },
    { keyword: '일론머스크', monthlyVolume: 152700, competition: 'medium', serpDifficulty: 55, reason: '거대 검색량, 브래드 크럼 역할. 난이도 높아 메인으로는 비추천' },
    { keyword: '테슬라스페이스X', monthlyVolume: 5630, competition: 'medium', reason: '시너지 강조 키워드' },
  ],
  trendKeywords: [
    {
      keyword: '스타링크',
      monthlyVolume: 77300,
      competition: 'medium',
      trend: '안정적',
      relevance: '높음',
      insight: '안정적 관심도 유지, 우주 인터넷 서비스로 일반 대중 관심. 스타링크 가입자 925만명, 월 요금 80~120달러',
    },
    {
      keyword: 'SpaceX IPO',
      trend: '변동',
      relevance: '높음',
      insight: '뉴스 이벤트 드리브, 변동성 높음. 스타링크 기술 설명 + IPO 기회 분석으로 조합 필요',
    },
  ],
  titleOptions: [
    {
      title: '스페이스X IPO 2026년 상장, 1.5조 달러 기업가치 분석 (테슬라 시너지)',
      length: 42,
      reasoning: '정보글 신뢰도 + 테슬라 연관성 강조, 메인+서브 키워드 모두 타겟',
      selected: true,
      keywordCoverage: ['스페이스X', 'IPO', '상장', '기업가치', '테슬라'],
      ctrEstimate: '높음',
      targetIntent: '정보형 + 투자형 동시 충족',
    },
    {
      title: '스페이스X 상장 확정? 스타링크 수익 + 우주 데이터센터 전략 분석',
      length: 36,
      reasoning: '수익 구조 + 미래 비전 포괄, 기술/우주 관심층 + 투자자 타겟',
      keywordCoverage: ['스페이스X', '상장', '스타링크'],
      ctrEstimate: '중간',
    },
    {
      title: '일론머스크, 스페이스X 상장 왜 서두르나? 화성 식민지화 로드맵',
      length: 35,
      reasoning: '스토리 기반 (왜 서두르나?) + 미래 비전, 기술/우주 열정층 + 광범위 검색자',
      keywordCoverage: ['일론머스크', '스페이스X', '상장'],
      ctrEstimate: '높음',
    },
    {
      title: '스페이스X IPO 투자 방법 + 스타링크 기업가치 평가까지',
      length: 34,
      reasoning: '투자 실용성 + 재무 분석, 개인 투자자 타겟',
      keywordCoverage: ['스페이스X', 'IPO', '스타링크'],
      ctrEstimate: '중간',
    },
    {
      title: '2026년 가장 기대되는 IPO, 스페이스X 상장 완벽 가이드',
      length: 32,
      reasoning: 'HOW-TO 형식 (SEO 친화적), IPO 초보자 타겟',
      keywordCoverage: ['스페이스X', '상장', 'IPO'],
      ctrEstimate: '중간',
    },
  ],
  keywordCandidates: [
    { keyword: '스페이스X 상장', pcVolume: 28500, mobileVolume: 124400, totalVolume: 152900, competition: 'low' as const, serpDifficulty: 46, ctr: 0.8, adCount: 0, selected: true, recommendation: '즉시 진입 추천', reason: '검색량 높고 경쟁도 낮아 최적' },
    { keyword: '스타링크', pcVolume: 16100, mobileVolume: 61200, totalVolume: 77300, competition: 'medium' as const, serpDifficulty: 46, recommendation: '서브 키워드로 활용', reason: '독립적 수요 높으나 범위 넓음' },
    { keyword: '일론머스크', pcVolume: 24500, mobileVolume: 128200, totalVolume: 152700, competition: 'medium' as const, serpDifficulty: 55, recommendation: '비추천 (메인)', reason: '너무 넓은 키워드, 난이도 높음' },
    { keyword: '테슬라스페이스X', pcVolume: 1200, mobileVolume: 4430, totalVolume: 5630, competition: 'medium' as const, recommendation: '보조 활용', reason: '시너지 키워드로 자연 포함' },
    { keyword: 'SpaceX IPO', pcVolume: 3200, mobileVolume: 1800, totalVolume: 5000, competition: 'low' as const, recommendation: '영문 보조 키워드', reason: '영문 검색자 흡수용' },
  ],
  trendData: [
    {
      keyword: '스페이스X 상장',
      dataPoints: [
        { period: '9월', value: 12 },
        { period: '10월', value: 18 },
        { period: '11월', value: 25 },
        { period: '12월', value: 45 },
        { period: '1월', value: 78 },
        { period: '2월', value: 100 },
      ],
      summary: '최근 3개월간 검색량 급증. IPO 발표 이후 지속 상승 추세',
    },
    {
      keyword: '스타링크',
      dataPoints: [
        { period: '9월', value: 65 },
        { period: '10월', value: 70 },
        { period: '11월', value: 68 },
        { period: '12월', value: 72 },
        { period: '1월', value: 75 },
        { period: '2월', value: 80 },
      ],
      summary: '안정적 관심도 유지. 우주 인터넷 서비스로 일반 대중 꾸준한 관심',
    },
  ],
  searchIntent: [
    { type: 'Informational (정보형)', percentage: 55, keywords: ['스페이스X 상장 일정', '기업가치', 'IPO란'], contentDirection: '상장 일정, 기업가치 분석 등 사실 기반 정보 제공' },
    { type: 'Transactional (투자형)', percentage: 45, keywords: ['스페이스X 주식 사는법', '관련주', 'ETF'], contentDirection: '투자 방법, 관련주 정보 등 실행 가능한 가이드' },
  ],
  serpCompetitors: [
    { rank: 1, title: '스피어가 스페이스X 상장 대장주인 이유와 현재 주가', wordCount: 1705, imageCount: 10, features: '관련주 투자 정보' },
    { rank: 2, title: '스페이스X IPO 상장 "한국 투자자도 참여 가능?"', wordCount: 1632, imageCount: 4, features: '투자 접근법' },
    { rank: 3, title: '스페이스X 상장 2026년 가능할까? 미국 주식 IPO 방법', wordCount: 2033, imageCount: 6, features: 'IPO 방법 설명' },
  ],
  blogCompetition: {
    serpDifficulty: 46,
    serpDifficultyLevel: '보통',
    totalResults: 3000,
    level: 'low',
    attackability: false,
    attackabilityReason: '상위 10개 모두 최신 게시글, 신선도 경쟁 중심. 즉시 게시 필요 또는 깊이 있는 분석으로 장기 노출',
    avgWordCount: 1790,
    avgImageCount: 7,
    strategy: [
      '신선도 경쟁에서 이기려면 즉시 게시 필요 (오늘~3일 내)',
      '깊이 있는 분석 콘텐츠로 장기 노출 (6개월+ 유지)',
      '스타링크, 테슬라, 우주 인프라 등 범주 확장으로 롱테일 수렴',
      '기업가치 분석: 1.5조 달러 밸류에이션 근거 (PS ratio 93.75배 설명)',
      '테슬라 시너지: FSD 개발용 AI 인프라 (경쟁글에서 누락된 차별점)',
    ],
  },
  insights: [
    '신선도 경쟁: 상위 10개 모두 최신 게시글 → 즉시 게시 필요',
    '깊이 차별화: 상위 글 평균 1,790자 vs. 3,000자 권장 → 1,200자 추가 가치 제공',
    '테슬라 시너지: 경쟁글에서 누락된 부분 → 독자적 분석 강점',
    'LSI 키워드 확보: 자동완성 롱테일 (관련주, 일정, 구매방법) 자연스럽게 포함',
    '모바일 최적화: 검색의 85% 이상이 모바일 (124,400/152,900)',
  ],
  risks: [
    '과도한 관련주 정보: 금융감독 위반 가능성 → 면책조항 필수',
    '추측/미확인 정보: 신뢰도 하락 → 공식 발표, 기사, 유튜브 영상 인용',
    '짧은 본문 (1,500자): 경쟁 콘텐츠와 구별 불가 → 최소 2,500자 이상',
    '단순 나열식 구성: SEO 난이도 상승 → H2/H3 계층 + 표/차트 + 설명 결합',
  ],
  analyzedAt: '2026-02-15',
}

// =====================================================
// 2. 클로드 코워크 글
// =====================================================
const claudeCoworkSeo = {
  mainKeyword: {
    keyword: '클로드코워크',
    monthlyVolume: 57700,
    pcVolume: 21100,
    mobileVolume: 36600,
    competition: 'low',
    serpDifficulty: 46,
    ctr: 0,
    adCount: 0,
    recommendation: '즉시 진입 추천',
    reason: '월간 검색량 57,700으로 높고 경쟁도 낮음 (광고노출 0). 현재 HOT 키워드 (트렌드 상승 중). CTR 0%로 블로그 상위노출 미흡 = 개선 기회',
  },
  subKeywords: [
    { keyword: 'AI에이전트', monthlyVolume: 8530, competition: 'high', serpDifficulty: 57, reason: '높은 연관성, 중간 검색량. 메인글 내 비교 섹션 활용' },
    { keyword: '클로드코드', monthlyVolume: 15290, competition: 'medium', reason: '중간 검색량, 낮은 경쟁도. 후속 비교글 작성용' },
    { keyword: 'MCP', monthlyVolume: 5570, competition: 'medium', reason: '기술 관심층 대상' },
    { keyword: '클로드 코워크 뜻', competition: 'low', reason: 'H2 섹션: "클로드 코워크란?"' },
    { keyword: '클로드 코워크 활용법', competition: 'low', reason: '메인 콘텐츠 중심' },
    { keyword: '클로드 코워크 가격', competition: 'low', reason: 'H3: "요금 정보" 부가 섹션' },
  ],
  trendKeywords: [
    {
      keyword: '클로드코워크',
      monthlyVolume: 57700,
      trend: '급상승',
      relevance: '최고',
      insight: '2월 초(코워크 출시 시점) 검색량 100배 증가, 현재도 높은 수준 유지 (64.7). 앞으로 3-6개월 핵심 키워드',
    },
    {
      keyword: 'AI에이전트',
      monthlyVolume: 8530,
      trend: '안정적',
      relevance: '높음',
      insight: '꾸준한 관심, 지속적 검색. 평균 3.8 → 최근 5.5',
    },
  ],
  keywordCandidates: [
    { keyword: '클로드코워크', pcVolume: 21100, mobileVolume: 36600, totalVolume: 57700, competition: 'low' as const, serpDifficulty: 46, ctr: 0, adCount: 0, selected: true, recommendation: '즉시 진입 추천', reason: 'HOT 키워드, 경쟁도 낮음' },
    { keyword: 'AI에이전트', pcVolume: 2800, mobileVolume: 5730, totalVolume: 8530, competition: 'high' as const, serpDifficulty: 57, recommendation: '서브 활용', reason: '연관성 높으나 경쟁 치열' },
    { keyword: '클로드코드', pcVolume: 5200, mobileVolume: 10090, totalVolume: 15290, competition: 'medium' as const, recommendation: '후속글용', reason: '별도 비교글 작성 추천' },
    { keyword: 'MCP', pcVolume: 1800, mobileVolume: 3770, totalVolume: 5570, competition: 'medium' as const, recommendation: '기술 보조', reason: '기술 관심층 대상' },
  ],
  trendData: [
    {
      keyword: '클로드코워크',
      dataPoints: [
        { period: '9월', value: 1 },
        { period: '10월', value: 1 },
        { period: '11월', value: 2 },
        { period: '12월', value: 3 },
        { period: '1월', value: 8 },
        { period: '2월', value: 100 },
      ],
      summary: '2월 초 코워크 출시와 함께 검색량 100배 증가. 앞으로 3-6개월 핵심 키워드',
    },
    {
      keyword: 'AI에이전트',
      dataPoints: [
        { period: '9월', value: 38 },
        { period: '10월', value: 42 },
        { period: '11월', value: 40 },
        { period: '12월', value: 45 },
        { period: '1월', value: 50 },
        { period: '2월', value: 55 },
      ],
      summary: '꾸준한 관심 유지, 점진적 상승 추세',
    },
  ],
  titleOptions: [
    {
      title: '클로드 코워크 원리 완벽 가이드 (AI에이전트 초보자 필독)',
      length: 30,
      reasoning: '검색 의도 직접 충족, 초보자 타겟팅, CTR 높음 (괄호 안 추가 정보)',
      selected: true,
      keywordCoverage: ['클로드 코워크', '원리', 'AI에이전트'],
      ctrEstimate: '높음',
      targetIntent: '정보형 + 실용형 동시 충족',
    },
    {
      title: '2026년 클로드 코워크 시작하는 법 (5분 완벽 가이드)',
      length: 31,
      reasoning: '행동 유도형, 실용성 강조, 비즈니스 유저 타겟',
      keywordCoverage: ['클로드 코워크'],
      ctrEstimate: '높음',
    },
    {
      title: 'AI 에이전트 시대, 클로드 코워크가 뭐길래? (3분 이해)',
      length: 34,
      reasoning: '호기심 유발, 2가지 키워드 포함, CTR 매우 높음',
      keywordCoverage: ['AI 에이전트', '클로드 코워크'],
      ctrEstimate: '매우 높음',
    },
    {
      title: '클로드 코워크 vs 클로드 코드, 뭐가 다를까? (완벽 비교)',
      length: 32,
      reasoning: '"vs" 검색 의도 충족, 차별화, 도구 선택 고민자 타겟',
      keywordCoverage: ['클로드 코워크', '클로드 코드'],
      ctrEstimate: '높음',
    },
    {
      title: '클로드 코워크 실제 활용 사례 (3가지 실무 팁)',
      length: 28,
      reasoning: '실무 관심층 강조, CTR 높음 (숫자 포함)',
      keywordCoverage: ['클로드 코워크', '활용'],
      ctrEstimate: '중간',
    },
  ],
  searchIntent: [
    { type: 'Informational (정보 검색)', percentage: 40, keywords: ['클로드 코워크 뜻', '클로드 코워크란', '원리'], contentDirection: '개념 설명, 작동 원리, 기존 AI와의 차이점' },
    { type: 'Practical (실용 검색)', percentage: 30, keywords: ['클로드 코워크 활용법', '사용법', '시작하는 법'], contentDirection: '단계별 사용 가이드, 실제 활용 사례' },
    { type: 'Commercial (상업 검색)', percentage: 15, keywords: ['클로드 코워크 가격', '무료', '구독'], contentDirection: '요금 정보, 무료 사용 범위' },
    { type: 'Comparative (비교 검색)', percentage: 15, keywords: ['클로드 코워크 vs 코드', 'AI에이전트 비교'], contentDirection: '유사 도구 비교, 선택 가이드' },
  ],
  serpCompetitors: [
    { rank: 1, title: '"마이크로소프트도 폭락"시킨 클로드 코워크 주식 관련주는?', platform: '네이버', wordCount: 1629, imageCount: 5, features: '투자 관점' },
    { rank: 2, title: '미국 SW주식 급락의 진짜 이유, 앤트로픽 \'클로드 코워크\'였다', platform: '네이버', wordCount: 1721, imageCount: 5, features: '뉴스 기반' },
    { rank: 3, title: '미국 소프트웨어 주가 급락, 클로드 코워크가 뭐길래?', platform: '네이버', wordCount: 1558, imageCount: 4, features: '설명 중심' },
    { rank: 4, title: '클로드 코워크 뜻 활용 사례', platform: '네이버', wordCount: 1387, imageCount: 2, features: '정보 중심' },
    { rank: 5, title: '클로드 코워크 Claude Cowork와 소프트웨어 산업', platform: '네이버', wordCount: 1513, imageCount: 1, features: '산업 분석' },
  ],
  blogCompetition: {
    serpDifficulty: 46,
    serpDifficultyLevel: '보통',
    level: 'low',
    attackability: true,
    attackabilityReason: '상위글 평균 글자수 1,562자로 낮고 이미지도 평균 3.4개로 미흡. 댓글/공감 반응도 낮음(0-2개) → 차별화 기회',
    avgWordCount: 1562,
    avgImageCount: 3,
    strategy: [
      '권장 글자수: 2,000자 이상 (상위글 +30% 이상)',
      '권장 이미지: 5개 이상 (다이어그램, 비교표, 스크린샷)',
      'H2 헤딩에 메인 키워드 포함',
      '트렌드 활용: "2026년", "신기술" 등 시의성 강조',
      '비교 콘텐츠: "클로드 코워크 vs AI에이전트" 추가 섹션',
    ],
  },
  insights: [
    '클로드코워크는 현재 HOT 키워드 (트렌드 상승 중) → 즉시 진입 기회',
    '검색량 57,700으로 높고 경쟁도 낮음 → 상위노출 용이',
    '상위글 평균 1,562자로 매우 얕음 → 깊이 있는 콘텐츠로 차별화 용이',
    '2월 초 검색량 100배 증가 → 앞으로 3-6개월 핵심 키워드',
    '모바일 검색량 36,600 > PC 21,100 → 모바일 최적화 필수',
  ],
  risks: [
    '검색량 낮은 "업무자동화" 중심 작성 주의 (영향도 미미)',
    '과도한 키워드 채우기 주의 (자연스러움 방해)',
    '가격 정보 오류 주의 (베타 서비스이므로 변동 가능)',
    'YouTube 영상 출처 명시 필수 (저작권)',
    '앤트로픽 공식 정보와의 일치성 검증 필수',
  ],
  analyzedAt: '2026-02-15',
}

// =====================================================
// 3. 주토피아 퍼즐 글
// =====================================================
const puzzleSeo = {
  mainKeyword: {
    keyword: '주토피아퍼즐',
    monthlyVolume: 550,
    pcVolume: 180,
    mobileVolume: 370,
    competition: 'medium',
    serpDifficulty: 53,
    ctr: 2.1,
    adCount: 3,
    recommendation: '추천',
    reason: '검색량 550으로 적절한 규모, 과도한 경쟁을 피하면서 제품 구매 비교 및 추천 의도가 명확함',
  },
  subKeywords: [
    { keyword: '디즈니퍼즐', monthlyVolume: 780, competition: 'high', reason: '상위 제품 카테고리' },
    { keyword: '직소퍼즐', monthlyVolume: 9320, competition: 'high', reason: '범용 카테고리' },
    { keyword: '유아퍼즐', monthlyVolume: 2050, competition: 'medium', reason: '타겟 오디언스 연령대' },
    { keyword: '아동퍼즐', monthlyVolume: 1520, competition: 'medium', reason: '연령대 명시' },
    { keyword: '퍼즐 1000피스', monthlyVolume: 4000, competition: 'medium', reason: '피스별 검색' },
  ],
  trendKeywords: [
    {
      keyword: '주토피아2',
      monthlyVolume: 642900,
      competition: 'medium',
      trend: '급상승',
      intent: '영화/뉴스',
      relevance: '높음',
      insight: '영화 개봉(2025.11) 이후 검색량 급증, 스토리 퍼즐 제품과 직접 연계 가능',
    },
    {
      keyword: '주토피아2영화',
      monthlyVolume: 450,
      competition: 'high',
      trend: '상승',
      intent: '영화 정보',
      relevance: '중간',
    },
  ],
  keywordCandidates: [
    { keyword: '주토피아퍼즐', pcVolume: 180, mobileVolume: 370, totalVolume: 550, competition: 'medium' as const, serpDifficulty: 53, ctr: 2.1, adCount: 3, selected: true, recommendation: '추천', reason: '구매 의도 명확, 적절한 규모' },
    { keyword: '디즈니퍼즐', pcVolume: 250, mobileVolume: 530, totalVolume: 780, competition: 'high' as const, recommendation: '서브 키워드', reason: '상위 카테고리, 경쟁 높음' },
    { keyword: '직소퍼즐', pcVolume: 2800, mobileVolume: 6520, totalVolume: 9320, competition: 'high' as const, recommendation: '비추천 (메인)', reason: '범용 키워드, 경쟁 과다' },
    { keyword: '유아퍼즐', pcVolume: 620, mobileVolume: 1430, totalVolume: 2050, competition: 'medium' as const, recommendation: '보조 활용', reason: '타겟 연령대 키워드' },
  ],
  trendData: [
    {
      keyword: '주토피아퍼즐',
      dataPoints: [
        { period: '9월', value: 15 },
        { period: '10월', value: 20 },
        { period: '11월', value: 65 },
        { period: '12월', value: 100 },
        { period: '1월', value: 80 },
        { period: '2월', value: 60 },
      ],
      summary: '주토피아2 영화 개봉(2025.11) 이후 검색량 급증 후 점차 안정화',
    },
    {
      keyword: '주토피아2',
      dataPoints: [
        { period: '9월', value: 8 },
        { period: '10월', value: 25 },
        { period: '11월', value: 100 },
        { period: '12월', value: 75 },
        { period: '1월', value: 45 },
        { period: '2월', value: 30 },
      ],
      summary: '영화 개봉 월 최고치 기록 후 하락 중이나 여전히 높은 관심',
    },
  ],
  titleOptions: [
    {
      title: '주토피아 퍼즐 2종 비교 (150vs스토리, 뭐가 나을까?)',
      length: 28,
      reasoning: '비교형, SERP 상위 비교글 거의 없어 차별화 높음, 구매 결정 의도 사용자 타겟',
      selected: true,
      keywordCoverage: ['주토피아', '퍼즐', '비교'],
      ctrEstimate: '높음',
      targetIntent: '비교형 + 구매형 동시 충족',
    },
    {
      title: '주토피아 퍼즐 추천, 150피스 직소퍼즐 솔직 후기',
      length: 31,
      reasoning: '추천+후기 키워드 동시 포함, 신뢰성 강조',
      keywordCoverage: ['주토피아', '퍼즐', '추천', '직소퍼즐'],
      ctrEstimate: '중간',
    },
    {
      title: '주토피아 퍼즐 가성비 왕, 6640원 직소퍼즐 VS 스토리퍼즐',
      length: 38,
      reasoning: '가격 민감 사용자 타겟, 높은 전환율 기대',
      keywordCoverage: ['주토피아', '퍼즐', '직소퍼즐', '스토리퍼즐'],
      ctrEstimate: '높음',
    },
  ],
  searchIntent: [
    { type: 'Informational (정보 추구)', percentage: 40, keywords: ['주토피아 퍼즐 종류', '퍼즐 추천'], contentDirection: '제품 비교, 스펙 정보, 연령별 추천' },
    { type: 'Transactional (구매 목표)', percentage: 45, keywords: ['주토피아 퍼즐 가격', '퍼즐 구매', '최저가'], contentDirection: '가격 비교, 구매 링크, 가성비 분석' },
    { type: 'Navigational (특정 제품 검색)', percentage: 15, keywords: ['퍼즐라이프 주토피아', 'D150-49'], contentDirection: '특정 제품 상세 정보' },
  ],
  serpCompetitors: [
    { rank: 1, title: '8월~9월 기록 (주토피아 퍼즐...)', wordCount: 3103, imageCount: 31, freshnessDays: 525, features: '노후글 (공략 기회)' },
    { rank: 2, title: '주토피아 3D 퍼즐 북눅 만들기', wordCount: 556, imageCount: 31, freshnessDays: 34, features: '신선, 저품질' },
    { rank: 3, title: '12월 즐기기 (주토피아2 퍼즐...)', wordCount: 2164, imageCount: 37, freshnessDays: 71, features: '주토피아2 연계' },
    { rank: 4, title: '주토피아2 퍼즐 1000 피스 취미추천', freshnessDays: 59, features: '신선' },
    { rank: 5, title: '퍼즐라이프 디즈니 주토피아 직소퍼즐 D545 추천', freshnessDays: 33, features: '신선, 제품 리뷰' },
  ],
  blogCompetition: {
    serpDifficulty: 53,
    serpDifficultyLevel: '어려움',
    totalResults: 10000,
    level: 'low',
    attackability: false,
    attackabilityReason: '주토피아2 영화 개봉 후 신선한 콘텐츠 대량 발행, 최근 1개월 내 다수 게시물 존재',
    avgWordCount: 1941,
    avgImageCount: 33,
    strategy: [
      '신선도: 신규 게시물 작성 (타이밍 중요)',
      '차별화: 단순 리뷰 아닌 "비교 분석" 또는 "사용 경험 상세 리포트"',
      '품질: 이미지 30장 이상, 3000자 이상 고급 콘텐츠',
      '전문성: 아이 발달 단계별 추천, 가성비 분석 등',
    ],
  },
  shoppingData: {
    totalProducts: 30,
    averagePrice: 14824,
    priceRange: { min: 3820, max: 23000 },
    medianPrice: 14400,
  },
  insights: [
    '트렌드 연계: 주토피아2 영화 개봉(2025.11) → 검색량 642,900 (메인의 1000배 이상)',
    '저가격 포지셔닝: 시장 평균 대비 50% 저가 (구매 설득력 높음)',
    '낮은 경쟁: "주토피아 퍼즐" 검색 경쟁도 "낮음" (비교적 진입 용이)',
    '다양한 길이: 150/300/500/1000 피스 자동완성 → 롱테일 기회',
    '상업 의도 명확: Transactional 의도 45% (높은 전환율)',
  ],
  risks: [
    '높은 신선도 기준: 최근 1개월 내 게시물 대량 존재 (타이밍 중요)',
    '인플루언서 경쟁: 셀러브리티/브랜드 공식 채널 영향 존재',
    'SERP 난이도: 53/100 (전문성/품질 기준 높음)',
    '영화 연계 수명성: 영화 인기도 하락 시 주토피아2 관심도 저하 가능',
  ],
  analyzedAt: '2026-02-15',
}

// =====================================================
// 실행
// =====================================================
const updates = [
  { id: 'NYpzmZYhylolkT1YqrFS', name: '스페이스X 상장', data: spaceXSeo },
  { id: 'RnT9rfa5nYb5Z01hleRM', name: '클로드 코워크', data: claudeCoworkSeo },
  { id: 'bRyrbAmli5c5OFVOhqMG', name: '주토피아 퍼즐', data: puzzleSeo },
]

async function main() {
  for (const { id, name, data } of updates) {
    console.log(`Updating "${name}" (${id})...`)
    await db.collection('blog_posts').doc(id).update({ seoAnalysis: data })
    console.log(`  ✓ Done`)
  }
  console.log('\nAll 3 posts updated!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
