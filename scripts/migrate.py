#!/usr/bin/env python3
# /// script
# dependencies = ["firebase-admin"]
# ///
"""
Migration Script: outputs 폴더의 콘텐츠를 Firestore로 이전

사용법:
    uv run scripts/migrate.py
    uv run scripts/migrate.py --dry-run  # 실제 저장 없이 테스트
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore


def get_project_root():
    """프로젝트 루트 경로 찾기"""
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / ".claude").exists():
            return parent
    return current.parent.parent


def init_firebase():
    """Firebase 초기화"""
    if firebase_admin._apps:
        return firestore.client()

    project_root = get_project_root()
    service_account_path = project_root / "properties" / "google-services.json"

    if not service_account_path.exists():
        print(f"Error: 서비스 계정 파일을 찾을 수 없습니다: {service_account_path}", file=sys.stderr)
        sys.exit(1)

    cred = credentials.Certificate(str(service_account_path))
    firebase_admin.initialize_app(cred)
    return firestore.client()


def extract_text(html: str) -> str:
    """HTML에서 텍스트 추출"""
    text = re.sub(r'<[^>]*>', '', html)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def extract_thumbnail(html: str) -> str:
    """HTML에서 첫 번째 이미지 URL 추출"""
    match = re.search(r'<img[^>]+src="([^"]+)"', html)
    return match.group(1) if match else ''


def extract_excerpt(html: str, max_length: int = 200) -> str:
    """HTML에서 발췌문 생성"""
    text = extract_text(html)
    return text[:max_length] + '...' if len(text) > max_length else text


def count_words(html: str) -> int:
    """글자 수 계산"""
    return len(extract_text(html))


def migrate_outputs(dry_run: bool = False):
    """outputs 폴더 탐색 및 마이그레이션"""
    project_root = get_project_root()
    outputs_dir = project_root / "outputs"

    if not outputs_dir.exists():
        print(f"❌ outputs 폴더를 찾을 수 없습니다: {outputs_dir}")
        sys.exit(1)

    db = init_firebase()
    collection = db.collection("blog_posts")

    # 하위 폴더 목록 가져오기
    folders = [f for f in outputs_dir.iterdir() if f.is_dir()]
    print(f"📁 {len(folders)}개의 폴더를 발견했습니다.")

    migrated = 0
    skipped = 0
    failed = 0

    for folder in folders:
        content_path = folder / "content.html"

        # content.html 파일 확인
        if not content_path.exists():
            print(f"  ⏭️  {folder.name}: content.html 없음, 스킵")
            skipped += 1
            continue

        try:
            # HTML 콘텐츠 읽기
            content = content_path.read_text(encoding='utf-8')

            # 기존 문서 확인 (중복 방지)
            existing_query = collection.where(
                "metadata.originalPath", "==", f"outputs/{folder.name}"
            ).get()

            if existing_query:
                print(f"  ⏭️  {folder.name}: 이미 마이그레이션됨, 스킵")
                skipped += 1
                continue

            # 문서 데이터 생성
            now = firestore.SERVER_TIMESTAMP
            word_count = count_words(content)

            doc_data = {
                "title": folder.name,
                "content": content,
                "excerpt": extract_excerpt(content),
                "thumbnail": extract_thumbnail(content),
                "keywords": [],  # 추후 수동 추가
                "status": "draft",
                "platform": "both",
                "createdAt": now,
                "updatedAt": now,
                "metadata": {
                    "originalPath": f"outputs/{folder.name}",
                    "wordCount": word_count,
                },
            }

            if dry_run:
                print(f"  🔍 {folder.name}: 마이그레이션 예정 ({word_count}자)")
            else:
                collection.add(doc_data)
                print(f"  ✅ {folder.name}: 마이그레이션 완료 ({word_count}자)")

            migrated += 1

        except Exception as e:
            print(f"  ❌ {folder.name}: 마이그레이션 실패 - {e}")
            failed += 1

    print("")
    print("=" * 50)
    print(f"📊 마이그레이션 결과:")
    print(f"   {'🔍 예정' if dry_run else '✅ 성공'}: {migrated}개")
    print(f"   ⏭️  스킵: {skipped}개")
    print(f"   ❌ 실패: {failed}개")
    print("=" * 50)


def main():
    parser = argparse.ArgumentParser(description="outputs 폴더 콘텐츠를 Firestore로 마이그레이션")
    parser.add_argument("--dry-run", action="store_true", help="실제 저장 없이 테스트")

    args = parser.parse_args()

    migrate_outputs(dry_run=args.dry_run)
    print("✨ 마이그레이션 완료!")


if __name__ == "__main__":
    main()
