# 🛠️ TechReviewLabs 기술 명세서 (Technical Specification Master)

> 이 문서는 TechReviewLabs 테크 리뷰 사이트의 완전한 기술 스펙을 정의합니다.
> 모든 설정값, 최적화 기법, 성능 목표를 포함합니다.

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [성능 목표](#성능-목표)
4. [아키텍처](#아키텍처)
5. [폰트 최적화](#폰트-최적화)
6. [이미지 최적화](#이미지-최적화)
7. [JavaScript 최적화](#javascript-최적화)
8. [CSS 최적화](#css-최적화)
9. [SEO 최적화](#seo-최적화)
10. [보안 설정](#보안-설정)
11. [환경 변수](#환경-변수)

---

## 프로젝트 개요

### 목적
댄 아브라모프의 `overreacted.io`를 벤치마킹하여 **극도로 빠른 로딩 속도**와 **탁월한 사용자 경험**을 제공하는 전자기기 리뷰 전문 사이트 구축

### 핵심 가치
- **성능 우선주의**: Lighthouse 97+ 점수 달성
- **제로 런타임 CSS**: Tailwind CSS로 런타임 오버헤드 제거
- **최소 JavaScript**: 필수 인터랙션만 클라이언트 사이드 처리
- **한글 최적화**: 한글 폰트, URL, SEO 완벽 지원
- **제품 리뷰 특화**: Product + Review 스키마로 SEO 최적화

---

## 기술 스택

### Core Framework
```yaml
Framework: Next.js 15.5.9
React: 19.0.0
TypeScript: 5.x
Node.js: 18.x 이상
```

### Rendering Strategy
```yaml
방식: Static Site Generation (SSG)
런타임: React Server Components
Pre-rendering: 모든 페이지 빌드 타임에 생성
Hydration: 필수 인터랙션만 선택적 hydration
```

### Styling
```yaml
CSS Framework: Tailwind CSS 3.4.1
Typography: @tailwindcss/typography
방식: Zero-runtime CSS-in-JS 제거
PostCSS: Autoprefixer, Critters
```

### Content Management
```yaml
Format: Markdown (.md) + MDX (.mdx)
Parser: gray-matter (frontmatter)
Renderer: react-markdown + remark-gfm
Reading Time: reading-time 패키지
Content Type: 전자기기 리뷰 (스마트폰, 노트북, 태블릿, 이어폰 등)
Metadata: 제품명, 카테고리, 평점 포함
```

### Deployment
```yaml
Platform: Vercel
Region: 자동 (Edge Network)
CDN: Vercel Edge Network
DNS: Vercel DNS 또는 Custom
```

---

## 성능 목표

### Lighthouse 점수
```yaml
Performance: 97+  (목표: 100)
Accessibility: 100
Best Practices: 100
SEO: 100
```

### Core Web Vitals
```yaml
LCP (Largest Contentful Paint): < 1.8s
FID (First Input Delay): < 50ms
CLS (Cumulative Layout Shift): < 0.05
FCP (First Contentful Paint): < 1.4s
TTI (Time to Interactive): < 2.5s
TBT (Total Blocking Time): < 30ms
Speed Index: < 4.0s
```

### Bundle Size 목표
```yaml
메인 JavaScript 번들: < 50KB (압축 후)
CSS 번들: < 10KB (압축 후)
총 페이지 크기: < 200KB (이미지 제외)
```

---

## 아키텍처

### 디렉토리 구조
```
techreviewlabs/
├── app/                        # Next.js App Router
│   ├── [slug]/                 # 동적 리뷰 페이지
│   │   └── page.tsx            # 개별 리뷰 렌더링
│   ├── layout.tsx              # 루트 레이아웃
│   ├── page.tsx                # 메인 페이지
│   ├── globals.css             # 전역 스타일
│   ├── robots.ts               # robots.txt 생성
│   └── sitemap.ts              # sitemap.xml 생성
├── components/                 # 재사용 컴포넌트
│   ├── Header.tsx              # 헤더 (로고, 네비게이션)
│   ├── Link.tsx                # 커스텀 링크
│   ├── ReviewCard.tsx          # 리뷰 카드 (평점, 카테고리 포함)
│   ├── QnA.tsx                 # Q&A 아코디언
│   └── TableOfContents.tsx     # 목차 (TOC)
├── lib/                        # 유틸리티 함수
│   ├── reviews.ts              # 리뷰 데이터 로딩
│   └── qna-utils.ts            # Q&A 파싱
├── content/                    # 콘텐츠
│   └── reviews/                # 마크다운 리뷰
│       ├── iphone-15-pro.md
│       ├── macbook-pro-m3.md
│       └── ...
├── public/                     # 정적 자산
│   ├── logo.png                # 로고 이미지
│   ├── favicon.ico             # 파비콘
│   └── images/                 # 리뷰 이미지
├── .browserslistrc             # 브라우저 타겟
├── next.config.ts              # Next.js 설정
├── tailwind.config.ts          # Tailwind 설정
├── tsconfig.json               # TypeScript 설정
└── package.json                # 의존성
```

### 데이터 플로우
```
1. 빌드 타임
   Markdown 파일 → gray-matter → Review 객체 배열 → 정적 HTML 생성
   메타데이터: 제품명, 카테고리, 평점 추출

2. 런타임 (클라이언트)
   정적 HTML 로드 → 선택적 Hydration (TOC, QnA만) → 인터랙션 활성화

3. SEO
   Product + Review 스키마 자동 생성 → 구글 검색 최적화
```

---

## 폰트 최적화

### 시스템 폰트 스택 사용 (권장)
```css
/* app/globals.css */
font-family:
  'Nanum Gothic',           /* 나눔고딕 (한글 우선) */
  'Malgun Gothic',          /* 맑은 고딕 (윈도우) */
  'Apple SD Gothic Neo',    /* 애플 고딕 (macOS/iOS) */
  -apple-system,            /* 시스템 기본 (macOS) */
  BlinkMacSystemFont,       /* 시스템 기본 (크롬) */
  sans-serif;               /* 폴백 */
```

**장점:**
- ✅ 0ms 폰트 로딩 시간 (이미 설치됨)
- ✅ CLS (Cumulative Layout Shift) 제로
- ✅ 네트워크 요청 없음
- ✅ 한글 렌더링 최적화

### 웹 폰트 사용 시 (선택)

#### Next.js Font 최적화
```typescript
// app/layout.tsx
import { Noto_Sans_KR } from 'next/font/google';

const notoSansKR = Noto_Sans_KR({
  weight: ['400', '700'],      // 필요한 굵기만
  subsets: ['latin'],          // latin만 (한글은 자동)
  display: 'swap',             // FOUT 방지
  preload: true,               // 사전 로딩
  fallback: ['system-ui', 'arial'], // 폴백 폰트
  adjustFontFallback: true,    // 폴백 폰트 크기 자동 조정
  variable: '--font-noto',     // CSS 변수
});

// 적용
<body className={notoSansKR.className}>
```

#### 폰트 서브셋팅
```bash
# pyftsubset 설치
pip install fonttools brotli

# 한글만 추출
pyftsubset NotoSansKR-Regular.otf \
  --unicodes="U+AC00-U+D7A3" \    # 한글 완성형
  --output-file="NotoSansKR-KR.woff2" \
  --flavor=woff2 \
  --layout-features='*' \
  --name-IDs='*'
```

#### font-display 전략
```css
@font-face {
  font-family: 'Noto Sans KR';
  src: url('/fonts/NotoSansKR-KR.woff2') format('woff2');
  font-display: swap;  /* FOIT 방지 */
  font-weight: 400;
  unicode-range: U+AC00-U+D7A3; /* 한글만 */
}
```

**Preload 설정**
```tsx
// app/layout.tsx
<head>
  <link
    rel="preload"
    href="/fonts/NotoSansKR-KR.woff2"
    as="font"
    type="font/woff2"
    crossOrigin="anonymous"
  />
</head>
```

---

## 이미지 최적화

### Next.js Image 컴포넌트 필수 사용
```typescript
import Image from 'next/image';

// 로컬 이미지
<Image
  src="/logo.png"
  alt="에이정 로고"
  width={200}
  height={50}
  priority              // LCP 이미지는 priority
  quality={90}          // 품질 (기본 75)
  placeholder="blur"    // 블러 효과 (로컬만)
/>

// 외부 이미지
<Image
  src="https://example.com/image.jpg"
  alt="설명"
  width={800}
  height={600}
  loading="lazy"        // Lazy loading (기본값)
  quality={85}
/>
```

### 이미지 포맷 변환 (JPG → WebP/AVIF)

#### ImageMagick 사용
```bash
# JPG → WebP 변환
magick convert input.jpg -quality 85 output.webp

# JPG → AVIF 변환
magick convert input.jpg -quality 75 output.avif

# 배치 변환
for file in *.jpg; do
  magick convert "$file" -quality 85 "${file%.jpg}.webp"
done
```

#### Sharp 사용 (Node.js)
```bash
npm install -D sharp
```

```javascript
// scripts/optimize-images.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = './public/images/original';
const outputDir = './public/images/optimized';

fs.readdirSync(inputDir).forEach(file => {
  if (file.match(/\.(jpg|jpeg|png)$/i)) {
    const input = path.join(inputDir, file);
    const name = path.parse(file).name;

    // WebP 변환
    sharp(input)
      .webp({ quality: 85 })
      .toFile(path.join(outputDir, `${name}.webp`));

    // AVIF 변환
    sharp(input)
      .avif({ quality: 75 })
      .toFile(path.join(outputDir, `${name}.avif`));

    // 리사이즈 (최대 1920px)
    sharp(input)
      .resize(1920, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: 85 })
      .toFile(path.join(outputDir, `${name}.jpg`));
  }
});
```

실행:
```bash
node scripts/optimize-images.js
```

### Next.js 이미지 설정
```typescript
// next.config.ts
export default {
  images: {
    formats: ['image/avif', 'image/webp'], // AVIF 우선, WebP 폴백
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,  // 1년 캐싱
    dangerouslyAllowSVG: false,  // SVG 비활성화 (보안)
    contentDispositionType: 'attachment',
    remotePatterns: [           // 외부 이미지 허용 도메인
      {
        protocol: 'https',
        hostname: 'example.com',
        pathname: '/images/**',
      },
    ],
  },
};
```

### 이미지 크기 가이드라인
```yaml
히어로 이미지: 1920×1080 (WebP 85%, < 150KB)
썸네일: 640×360 (WebP 80%, < 50KB)
로고/아이콘: SVG 또는 PNG (최대 50KB)
OG 이미지: 1200×630 (JPG 90%, < 100KB)
```

### Picture 태그로 폴백 제공
```tsx
<picture>
  <source srcSet="/image.avif" type="image/avif" />
  <source srcSet="/image.webp" type="image/webp" />
  <img src="/image.jpg" alt="설명" />
</picture>
```

---

## JavaScript 최적화

### 브라우저 타겟 설정
```
# .browserslistrc
defaults and supports es6-module
maintained node versions
```

**효과:**
- ES2020+ 문법 그대로 사용
- 불필요한 폴리필 제거 (~11KB 절감)
- Array.at, Object.hasOwn 등 네이티브 사용

### TypeScript 컴파일 타겟
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",  // ES2017에서 업그레이드
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler"
  }
}
```

### 번들 크기 최적화
```typescript
// next.config.ts
export default {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // console.log 제거
  },
  experimental: {
    optimizePackageImports: ['react-icons', 'react-markdown'], // 트리쉐이킹
  },
  modularizeImports: {  // 모듈별 임포트
    'react-markdown': {
      transform: 'react-markdown',
    },
  },
};
```

### Dynamic Import (코드 스플리팅)
```typescript
// 필요시에만 로드
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false,  // 클라이언트에서만 로드
});
```

### 클라이언트 컴포넌트 최소화
```typescript
// ❌ 나쁜 예: 전체를 클라이언트 컴포넌트로
'use client';
export default function Page() {
  const [state, setState] = useState();
  return <div>...</div>;
}

// ✅ 좋은 예: 인터랙션 부분만 클라이언트로
// page.tsx (Server Component)
export default function Page() {
  return (
    <div>
      <StaticContent />
      <InteractiveButton />  {/* 이것만 'use client' */}
    </div>
  );
}
```

---

## CSS 최적화

### Critical CSS 인라인화
```typescript
// next.config.ts
export default {
  experimental: {
    optimizeCss: true,  // Critters 활성화
  },
};
```

**설치:**
```bash
npm install -D critters
```

**효과:**
- 렌더링 차단 CSS 제거
- Critical CSS를 `<style>` 태그로 인라인
- 나머지 CSS는 비동기 로드
- **~160ms 렌더링 시간 단축**

### Tailwind CSS 최적화
```javascript
// tailwind.config.ts
export default {
  content: [
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  // 사용하지 않는 클래스 자동 제거 (PurgeCSS)
};
```

### CSS 압축 설정
```javascript
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {}),
  },
};
```

---

## SEO 최적화

### 메타데이터 설정
```typescript
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://techreviewlabs.xyz'),
  title: {
    default: 'TechReviewLabs - 전문 전자기기 리뷰',
    template: '%s — TechReviewLabs',
  },
  description: '스마트폰, 노트북, 태블릿, 이어폰 등 최신 전자기기에 대한 심층 리뷰와 비교 분석을 제공합니다.',
  keywords: ['스마트폰 리뷰', '노트북 리뷰', '태블릿 리뷰', '이어폰 리뷰', '전자기기', '테크 리뷰', '가젯 리뷰'],
  authors: [{ name: 'TechReviewLabs' }],
  creator: 'TechReviewLabs',
  publisher: 'TechReviewLabs',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://techreviewlabs.xyz',
    siteName: 'TechReviewLabs',
    title: 'TechReviewLabs - 전문 전자기기 리뷰',
    description: '스마트폰, 노트북, 태블릿, 이어폰 등 최신 전자기기에 대한 심층 리뷰와 비교 분석을 제공합니다.',
    images: [
      {
        url: '/og-image.jpg',  // 1200×630 권장
        width: 1200,
        height: 630,
        alt: 'TechReviewLabs - 전자기기 리뷰',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TechReviewLabs - 전문 전자기기 리뷰',
    description: '스마트폰, 노트북, 태블릿, 이어폰 등 최신 전자기기에 대한 심층 리뷰와 비교 분석을 제공합니다.',
    images: ['/og-image.jpg'],
    creator: '@techreviewlabs',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'YOUR_GOOGLE_VERIFICATION_CODE',
    yandex: 'YOUR_YANDEX_CODE',
    other: {
      'naver-site-verification': 'YOUR_NAVER_CODE',
    },
  },
};
```

### 개별 리뷰 메타데이터
```typescript
// app/[slug]/page.tsx
export async function generateMetadata({ params }: Props) {
  const review = getReviewBySlug(params.slug);
  const url = `https://techreviewlabs.xyz/${params.slug}`;

  return {
    title: review.title,
    description: review.excerpt,
    alternates: {
      canonical: url,  // 중복 방지
    },
    openGraph: {
      title: review.title,
      description: review.excerpt,
      url: url,
      siteName: 'TechReviewLabs',
      locale: 'ko_KR',
      type: 'article',
      publishedTime: review.date,
      authors: ['TechReviewLabs'],
      images: [
        {
          url: review.ogImage || '/og-image.jpg',
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: review.title,
      description: review.excerpt,
      images: [review.ogImage || '/og-image.jpg'],
    },
  };
}
```

### 구조화된 데이터 (JSON-LD)
```typescript
// app/layout.tsx
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'TechReviewLabs',
  alternateName: '테크리뷰랩스',
  url: 'https://techreviewlabs.xyz',
  description: '전자기기 리뷰 전문 사이트',
  publisher: {
    '@type': 'Organization',
    name: 'TechReviewLabs',
    logo: {
      '@type': 'ImageObject',
      url: 'https://techreviewlabs.xyz/logo.png',
    },
  },
};

// 개별 리뷰 스키마 (Product + Review)
const reviewSchema = {
  '@context': 'https://schema.org',
  '@type': 'Review',
  itemReviewed: {
    '@type': 'Product',
    name: review.product,
    category: review.category,
    image: review.ogImage,
  },
  reviewRating: {
    '@type': 'Rating',
    ratingValue: review.rating,
    bestRating: 5,
    worstRating: 1,
  },
  author: {
    '@type': 'Organization',
    name: 'TechReviewLabs',
  },
  publisher: {
    '@type': 'Organization',
    name: 'TechReviewLabs',
    logo: {
      '@type': 'ImageObject',
      url: 'https://techreviewlabs.xyz/logo.png',
    },
  },
  datePublished: review.date,
  reviewBody: review.excerpt,
};

// 렌더링
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
/>
```

### Sitemap 자동 생성
```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { getSortedReviewsData } from '@/lib/reviews';

export default function sitemap(): MetadataRoute.Sitemap {
  const reviews = getSortedReviewsData();
  const baseUrl = 'https://techreviewlabs.xyz';

  const reviewUrls = reviews.map((review) => ({
    url: `${baseUrl}/${encodeURIComponent(review.slug)}`,
    lastModified: new Date(review.date),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...reviewUrls,
  ];
}
```

### Robots.txt
```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        crawlDelay: 0,
      },
    ],
    sitemap: 'https://techreviewlabs.xyz/sitemap.xml',
    host: 'https://techreviewlabs.xyz',
  };
}
```

---

## 보안 설정

### 보안 헤더
```typescript
// next.config.ts
export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

---

## 환경 변수

### .env 파일
```env
# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# 사이트 URL
NEXT_PUBLIC_SITE_URL=https://techreviewlabs.xyz

# 사이트 이름
NEXT_PUBLIC_SITE_NAME=TechReviewLabs
```

### 환경 변수 사용
```typescript
// 서버 컴포넌트
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

// 클라이언트 컴포넌트
const gaId = process.env.NEXT_PUBLIC_GA_ID;
```

---

## 성능 체크리스트

### 빌드 최적화
- [✓] ES2020 타겟팅
- [✓] Tree-shaking 활성화
- [✓] Code splitting
- [✓] 불필요한 폴리필 제거
- [✓] console.log 제거 (프로덕션)

### 이미지 최적화
- [✓] Next.js Image 사용
- [✓] WebP/AVIF 포맷
- [✓] Lazy loading
- [✓] 적절한 크기 조정
- [✓] Priority 힌트 사용

### 폰트 최적화
- [✓] 시스템 폰트 스택 사용
- [✓] font-display: swap
- [✓] Preload 적용
- [✓] 서브셋팅

### CSS 최적화
- [✓] Critical CSS 인라인
- [✓] 미사용 CSS 제거
- [✓] CSS 압축
- [✓] Zero-runtime

### JavaScript 최적화
- [✓] 번들 크기 최소화
- [✓] Server Components 우선
- [✓] Dynamic import
- [✓] 필수 hydration만

### SEO
- [✓] 메타데이터 완성
- [✓] Sitemap 생성
- [✓] Robots.txt
- [✓] 구조화된 데이터 (Product + Review 스키마)
- [✓] Open Graph
- [✓] 보안 헤더
- [✓] 제품 리뷰 최적화

### 리뷰 사이트 특화 기능
- [✓] 제품 카테고리 분류
- [✓] 평점 시스템 (5점 만점)
- [✓] 제품명 메타데이터
- [✓] Review 스키마 마크업
- [✓] 검색 엔진 리뷰 스니펫 표시

---

**최종 목표: Lighthouse 97+ / Core Web Vitals 통과 / SEO 100점**

이 스펙대로 구현하면 **세계 최고 수준의 테크 리뷰 사이트 성능**을 달성할 수 있습니다.
