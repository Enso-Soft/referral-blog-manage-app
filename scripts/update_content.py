#!/usr/bin/env python3
# /// script
# dependencies = ["firebase-admin"]
# ///
"""
기존 Firestore 문서의 content를 outputs 폴더에서 다시 읽어 업데이트
"""

import re
import sys
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


def main():
    project_root = get_project_root()
    outputs_dir = project_root / "outputs"
    service_account_path = project_root / "properties" / "google-services.json"

    if not service_account_path.exists():
        print(f"Error: 서비스 계정 파일을 찾을 수 없습니다: {service_account_path}", file=sys.stderr)
        sys.exit(1)

    # Firebase 초기화
    cred = credentials.Certificate(str(service_account_path))
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    # 모든 blog_posts 문서 조회
    docs = db.collection("blog_posts").stream()
    updated = 0

    for doc in docs:
        data = doc.to_dict()
        original_path = data.get("metadata", {}).get("originalPath", "")

        if original_path:
            folder_name = original_path.replace("outputs/", "")
            content_path = outputs_dir / folder_name / "content.html"

            if content_path.exists():
                content = content_path.read_text(encoding='utf-8')

                # 문서 업데이트
                doc.reference.update({
                    "content": content,
                    "excerpt": extract_excerpt(content),
                    "thumbnail": extract_thumbnail(content),
                    "metadata.wordCount": len(extract_text(content)),
                })
                print(f"✅ 업데이트 완료: {folder_name}")
                updated += 1
            else:
                print(f"⚠️ content.html 없음: {folder_name}")

    print(f"\n✨ 총 {updated}개 문서 업데이트 완료!")


if __name__ == "__main__":
    main()
