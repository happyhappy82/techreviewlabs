# 🔥 TechReviewLabs

> 전자기기 리뷰 전문 사이트 - 스마트폰, 노트북, 태블릿, 이어폰 등

[![CI/CD](https://github.com/happyhappy82/techreviewlabs/actions/workflows/ci.yml/badge.svg)](https://github.com/happyhappy82/techreviewlabs/actions/workflows/ci.yml)
[![Lighthouse CI](https://img.shields.io/badge/Lighthouse-97%2B-success)](https://github.com/happyhappy82/techreviewlabs/actions/workflows/lighthouse-ci.yml)

## 🚀 특징

- ⚡ **초고속 로딩** - Next.js 15 + SSG로 Lighthouse 97+ 달성
- ⭐ **제품 평점 시스템** - 5점 만점 평가 및 카테고리 분류
- 🔍 **SEO 최적화** - Product + Review Schema.org 마크업
- 📱 **완벽한 반응형** - 모바일 최적화
- 🎯 **목차 자동 생성** - 스크롤 추적 TOC
- ❓ **Q&A 아코디언** - 자주 묻는 질문

## 🛠️ 기술 스택

- **Framework**: Next.js 15.5.9 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **Content**: Markdown + Gray Matter
- **Deployment**: Vercel (자동 배포)
- **CI/CD**: GitHub Actions

## 📦 설치 및 실행

### 로컬 개발 환경

```bash
# 저장소 클론
git clone https://github.com/happyhappy82/techreviewlabs.git
cd techreviewlabs

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
# → http://localhost:3000

# 프로덕션 빌드
npm run build
npm start
```

### 빌드 요구사항

- Node.js 18.x 이상
- npm 9.x 이상

## 📝 새 리뷰 작성

### 1. 리뷰 파일 생성

`content/reviews/` 폴더에 새 `.md` 파일 생성:

```markdown
---
title: "갤럭시 S24 Ultra 리뷰"
date: "2025-01-10"
excerpt: "삼성의 최신 플래그십 스마트폰"
category: "스마트폰"
rating: 4.7
product: "Samsung Galaxy S24 Ultra"
lightColor: "lab(62.926 59.277 -1.573)"
darkColor: "lab(80.993 32.329 -7.093)"
---

# 갤럭시 S24 Ultra 리뷰

## 디자인
...

## 성능
...

## Q&A

**Q. 배터리는 어떤가요?**
A. 하루 종일 사용 가능합니다.
```

### 2. 필수 Frontmatter 필드

- `title`: 리뷰 제목
- `date`: 작성일 (YYYY-MM-DD)
- `excerpt`: 요약 (한 줄)
- `category`: 카테고리 (스마트폰, 노트북, 태블릿, 이어폰, 스마트워치, 카메라, 기타)
- `rating`: 평점 (0-5 사이 소수점 가능)
- `product`: 제품명

### 3. Git 커밋 및 푸시

```bash
git add content/reviews/galaxy-s24-ultra.md
git commit -m "Add Galaxy S24 Ultra review"
git push
```

→ **Vercel이 자동으로 배포** (약 2분 소요)

## 🤖 GitHub Actions 워크플로우

### 1️⃣ CI/CD Pipeline (`ci.yml`)

모든 push와 PR에서 자동 실행:

- ✅ TypeScript 타입 체크
- ✅ ESLint 검사
- ✅ 프로덕션 빌드 테스트
- ✅ 번들 크기 확인
- ✅ 보안 취약점 검사

### 2️⃣ Lighthouse CI (`lighthouse-ci.yml`)

PR 생성 시 성능 측정:

- 📊 Performance 점수 (목표: 97+)
- 📊 FCP, LCP 측정
- 📊 JavaScript 번들 크기 검증
- 💬 PR에 자동 코멘트

### 3️⃣ Review Validation (`review-validation.yml`)

새 리뷰 추가 시 자동 검증:

- ✅ 필수 frontmatter 필드 확인
- ✅ 평점 범위 검증 (0-5)
- ✅ 날짜 형식 검증 (YYYY-MM-DD)
- ⚠️  카테고리 검증

### 4️⃣ Auto Release (`auto-release.yml`)

main 브랜치 push 시:

- 📝 릴리즈 노트 자동 생성
- 🎉 새 리뷰 추가 알림

### 5️⃣ Dependency Update (`dependency-update.yml`)

매주 월요일 자동 실행:

- 📦 오래된 패키지 확인
- 🔒 보안 취약점 스캔

## 📊 성능 지표

현재 달성 수치:

- ⚡ First Load JS: **102-105 KB**
- 🎯 SSG 정적 생성
- 🚀 Build Time: **~5초**
- 📦 Total Routes: **8개**

목표:

- Lighthouse Performance: **97+**
- FCP: **< 1.5s**
- LCP: **< 2.0s**
- TBT: **< 50ms**
- CLS: **< 0.1**

## 🔗 링크

- **프로덕션**: https://techreviewlabs.xyz
- **GitHub**: https://github.com/happyhappy82/techreviewlabs
- **Vercel**: [대시보드](https://vercel.com/happyhappy82/techreviewlabs)

## 📄 라이선스

MIT License

## 👥 기여

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Made with ❤️ by happyhappy82**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
