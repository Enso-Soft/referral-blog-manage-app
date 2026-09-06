#!/bin/bash
# referral-blog 관리 프론트엔드(Next.js SSR) 무중단 배포 — myeogaeya webhook(9006) 가 호출.
#   1. git pull
#   2. 새 이미지 빌드(기존 컨테이너는 계속 서비스 중)
#   3. 컨테이너 교체
#   4. 헬스체크
# 빌드/런타임 env 는 같은 디렉토리 .env(gitignore, chmod 600) 에서 주입된다.
set -e
set -o pipefail

DEPLOY_DIR="/var/www/referral-blog/frontend/manage"
LOG_FILE="/var/log/referral-blog-frontend-manage-deploy.log"
HEALTH_URL="http://localhost:8015/"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cd "$DEPLOY_DIR"

log "=== 관리 프론트엔드 배포 시작 ==="

if [ ! -f .env ]; then
    log "ERROR: .env 파일이 없습니다. 배포 중단."
    exit 1
fi

# 1. 최신 코드 (로컬 untracked 배포파일 Dockerfile/compose/.env 는 pull 에 영향 없음)
log "git pull..."
if ! git pull --rebase origin main 2>&1 | tee -a "$LOG_FILE"; then
    git rebase --abort >/dev/null 2>&1 || true
    log "ERROR: upstream integration failed; running container preserved."
    exit 1
fi

# Preserve the working image independently of the mutable latest tag.
PREVIOUS_IMAGE=$(docker inspect --format '{{.Image}}' referral-blog-frontend-manage)
docker tag "$PREVIOUS_IMAGE" referral-blog-frontend-manage:previous

# 2. 새 이미지 빌드
log "이미지 빌드..."
docker compose build --builder enso-maintenance frontend-manage 2>&1 | tee -a "$LOG_FILE"

# 3. 컨테이너 교체
log "컨테이너 교체..."
docker compose up -d --no-deps --no-build frontend-manage 2>&1 | tee -a "$LOG_FILE"

# 4. 헬스체크 (SSR cold start 고려해 넉넉히)
log "헬스체크 대기..."
for i in $(seq 1 40); do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        log "헬스체크 성공! 배포 완료."
        # Preserve previous images for rollback; cleanup is a separate maintenance task.
        log "=== 관리 프론트엔드 배포 완료 ==="
        exit 0
    fi
    sleep 2
done

log "ERROR: 헬스체크 실패! 컨테이너 로그 확인 필요."
docker compose logs --tail=50 frontend-manage 2>&1 | tee -a "$LOG_FILE"
log "Restoring the previous image..."
docker tag referral-blog-frontend-manage:previous referral-blog-frontend-manage:latest
docker compose up -d --no-deps --no-build frontend-manage
exit 1
