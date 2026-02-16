const THREADS_API_BASE = 'https://graph.threads.net/v1.0'

interface ThreadsProfile {
  id: string
  username: string
  threads_profile_picture_url?: string
}

interface ThreadsContainerParams {
  accessToken: string
  userId: string
  text: string
  mediaType?: 'TEXT' | 'IMAGE'
  imageUrl?: string
  linkUrl?: string
}

interface ThreadsPublishParams {
  accessToken: string
  userId: string
  containerId: string
}

interface ThreadsContainerStatus {
  id: string
  status: 'IN_PROGRESS' | 'FINISHED' | 'ERROR'
  error_message?: string
}

export async function getThreadsProfile(accessToken: string): Promise<ThreadsProfile> {
  const res = await fetch(
    `${THREADS_API_BASE}/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`
  )
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.error?.message || 'Threads 프로필 조회에 실패했습니다')
  }
  return res.json()
}

export async function createThreadsContainer(params: ThreadsContainerParams): Promise<{ id: string }> {
  const body: Record<string, string> = {
    text: params.text,
    media_type: params.mediaType || 'TEXT',
    access_token: params.accessToken,
  }

  if (params.mediaType === 'IMAGE' && params.imageUrl) {
    body.image_url = params.imageUrl
  }

  if (params.linkUrl) {
    body.link_attachment = params.linkUrl
  }

  const res = await fetch(`${THREADS_API_BASE}/${params.userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.error?.message || 'Threads 컨테이너 생성에 실패했습니다')
  }

  return res.json()
}

export async function publishThreadsContainer(params: ThreadsPublishParams): Promise<{ id: string }> {
  const res = await fetch(`${THREADS_API_BASE}/${params.userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: params.containerId,
      access_token: params.accessToken,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.error?.message || 'Threads 게시에 실패했습니다')
  }

  return res.json()
}

export async function checkContainerStatus(
  containerId: string,
  accessToken: string
): Promise<ThreadsContainerStatus> {
  const res = await fetch(
    `${THREADS_API_BASE}/${containerId}?fields=status,error_message&access_token=${accessToken}`
  )
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.error?.message || '컨테이너 상태 확인에 실패했습니다')
  }
  return res.json()
}

export async function refreshThreadsToken(accessToken: string): Promise<{
  access_token: string
  token_type: string
  expires_in: number
}> {
  const res = await fetch(
    `${THREADS_API_BASE}/refresh_access_token?grant_type=th_refresh_token&access_token=${accessToken}`
  )
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.error?.message || '토큰 갱신에 실패했습니다')
  }
  return res.json()
}

// 컨테이너 상태 폴링 (최대 30초)
export async function waitForContainerReady(
  containerId: string,
  accessToken: string,
  maxAttempts = 10
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkContainerStatus(containerId, accessToken)

    if (status.status === 'FINISHED') return
    if (status.status === 'ERROR') {
      throw new Error(status.error_message || 'Threads 컨테이너 처리 중 오류가 발생했습니다')
    }

    // 3초 대기 후 재시도
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  throw new Error('Threads 컨테이너 처리 시간이 초과되었습니다')
}
