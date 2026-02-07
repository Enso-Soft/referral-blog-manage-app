import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlogEditor/1.0)',
      },
    })

    if (!response.ok) {
      console.error('Fetch failed:', response.status, response.statusText, url)
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
    }

    const arrayBuffer = await response.arrayBuffer()
    const customFileName = request.nextUrl.searchParams.get('filename')
    const fileName = customFileName || url.split('/').pop() || 'image.jpg'

    // RFC 5987 형식으로 파일명 인코딩 (한글 등 비ASCII 문자 지원)
    const encodedFileName = encodeURIComponent(fileName).replace(/['()]/g, escape)
    // ASCII 파일명은 안전한 문자만 포함하도록 변환
    const asciiFileName = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '\\"')
    const contentDisposition = `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': contentDisposition,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Download error:', errorMessage, 'URL:', url)
    return NextResponse.json({ error: 'Download failed', details: errorMessage }, { status: 500 })
  }
}
