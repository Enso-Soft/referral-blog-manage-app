import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getAuthFromApiKey } from '@/lib/auth-admin'

const DOCS_DIR = join(process.cwd(), 'docs', 'api')
const API_VERSION = '1.0.0'

// 사용 가능한 리소스 목록
const AVAILABLE_RESOURCES = ['publish', 'products'] as const
type ResourceType = (typeof AVAILABLE_RESOURCES)[number]

// 마크다운 파일 읽기
function readDocFile(resource: ResourceType): string | null {
  const filePath = join(DOCS_DIR, `${resource}.md`)

  if (!existsSync(filePath)) {
    return null
  }

  return readFileSync(filePath, 'utf-8')
}

// {{BASE_URL}} 플레이스홀더 치환
function replaceBaseUrl(markdown: string, baseUrl: string): string {
  return markdown.replace(/\{\{BASE_URL\}\}/g, baseUrl)
}

// GET: API 문서 조회
export async function GET(request: NextRequest) {
  try {
    // API 키 인증
    const auth = await getAuthFromApiKey(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'API 키가 필요합니다. X-API-Key 헤더를 확인하세요.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const resource = searchParams.get('resource') as ResourceType | null

    // Base URL 결정 (호스트 헤더 또는 기본값)
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`

    // 특정 리소스만 요청
    if (resource) {
      if (!AVAILABLE_RESOURCES.includes(resource)) {
        return NextResponse.json(
          {
            success: false,
            error: `유효하지 않은 리소스입니다. 사용 가능: ${AVAILABLE_RESOURCES.join(', ')}`
          },
          { status: 400 }
        )
      }

      const markdown = readDocFile(resource)
      if (!markdown) {
        return NextResponse.json(
          { success: false, error: `${resource} 문서를 찾을 수 없습니다.` },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        markdown: replaceBaseUrl(markdown, baseUrl),
        version: API_VERSION,
        resource,
      })
    }

    // 전체 문서 반환
    const docs: string[] = []

    docs.push(`# Blog API Documentation\n\nVersion: ${API_VERSION}\n\nBase URL: ${baseUrl}\n\n---\n`)

    for (const res of AVAILABLE_RESOURCES) {
      const markdown = readDocFile(res)
      if (markdown) {
        docs.push(replaceBaseUrl(markdown, baseUrl))
        docs.push('\n---\n')
      }
    }

    return NextResponse.json({
      success: true,
      markdown: docs.join('\n'),
      version: API_VERSION,
      resources: [...AVAILABLE_RESOURCES],
    })
  } catch (error) {
    console.error('Docs API error:', error)
    return NextResponse.json(
      { success: false, error: 'API 문서 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}
