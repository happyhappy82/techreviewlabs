# 🚀 TechReviewLabs 개발 마스터 플랜

> 이 문서는 TechReviewLabs 테크 리뷰 사이트를 처음부터 완벽하게 구축하기 위한 상세 개발 계획서입니다.
> 각 항목 완료 시 `[ ]`를 `[o]`로 변경하세요.

---

## 📋 프로젝트 개요

- **목표**: Overreacted.io 스타일의 초고속 테크 리뷰 사이트 구축
- **주제**: 스마트폰, 노트북, 태블릿, 이어폰 등 전자기기 리뷰
- **기술**: Next.js 15 (App Router), React Server Components, Tailwind CSS
- **성능**: Lighthouse 97+ 점수, 최소 JavaScript 번들
- **특징**: 한글 지원, LAB 컬러 시스템, SEO 최적화

---

## 1️⃣ 1단계: 프로젝트 초기화 (30분)

### 1.1 Next.js 프로젝트 생성
- [ ] Next.js 15+ 프로젝트 생성
  ```bash
  npx create-next-app@latest techreviewlabs
  # ✓ TypeScript: Yes
  # ✓ ESLint: Yes
  # ✓ Tailwind CSS: Yes
  # ✓ src/ directory: No
  # ✓ App Router: Yes
  # ✓ Customize default alias: No
  ```
- [ ] 프로젝트 디렉토리로 이동
  ```bash
  cd techreviewlabs
  ```

### 1.2 필수 패키지 설치
- [ ] Markdown 관련 패키지 설치
  ```bash
  npm install gray-matter reading-time react-markdown remark-gfm
  ```
- [ ] MDX 지원 패키지 설치
  ```bash
  npm install @mdx-js/loader @mdx-js/react @next/mdx @types/mdx
  ```
- [ ] Tailwind Typography 설치
  ```bash
  npm install -D @tailwindcss/typography
  ```
- [ ] CSS 최적화 패키지 설치
  ```bash
  npm install -D critters
  ```

### 1.3 프로젝트 구조 생성
- [ ] 필수 디렉토리 생성
  ```bash
  mkdir -p components lib content/reviews public
  ```
- [ ] 디렉토리 구조 확인
  ```
  ├── app/
  │   ├── [slug]/
  │   ├── layout.tsx
  │   ├── page.tsx
  │   ├── globals.css
  │   ├── robots.ts
  │   └── sitemap.ts
  ├── components/
  │   ├── Header.tsx
  │   ├── Link.tsx
  │   ├── ReviewCard.tsx
  │   ├── QnA.tsx
  │   └── TableOfContents.tsx
  ├── lib/
  │   ├── reviews.ts
  │   └── qna-utils.ts
  ├── content/
  │   └── reviews/
  ├── public/
  │   └── logo.png
  └── package.json
  ```

---

## 2️⃣ 2단계: 환경 설정 파일 구성 (20분)

### 2.1 TypeScript 설정
- [ ] `tsconfig.json` 수정
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "lib": ["dom", "dom.iterable", "esnext"],
      "allowJs": true,
      "skipLibCheck": true,
      "strict": true,
      "noEmit": true,
      "esModuleInterop": true,
      "module": "esnext",
      "moduleResolution": "bundler",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "jsx": "preserve",
      "incremental": true,
      "plugins": [{ "name": "next" }],
      "paths": {
        "@/*": ["./*"]
      }
    },
    "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    "exclude": ["node_modules"]
  }
  ```

### 2.2 Browserslist 설정
- [ ] `.browserslistrc` 파일 생성
  ```
  defaults and supports es6-module
  maintained node versions
  ```

### 2.3 Next.js 설정
- [ ] `next.config.ts` 작성
  ```typescript
  import type { NextConfig } from "next";
  import createMDX from "@next/mdx";

  const nextConfig: NextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
    productionBrowserSourceMaps: false,
    compress: true,
    images: {
      formats: ["image/avif", "image/webp"],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      minimumCacheTTL: 31536000,
    },
    experimental: {
      optimizePackageImports: ["react-icons", "react-markdown"],
      optimizeCss: true,
    },
    compiler: {
      removeConsole: process.env.NODE_ENV === "production",
    },
    modularizeImports: {
      "react-markdown": {
        transform: "react-markdown",
      },
    },
  };

  const withMDX = createMDX({
    extension: /\.mdx?$/,
    options: {
      remarkPlugins: [],
      rehypePlugins: [],
    },
  });

  export default withMDX(nextConfig);
  ```

### 2.4 Tailwind CSS 설정
- [ ] `tailwind.config.ts` 작성
  ```typescript
  import type { Config } from "tailwindcss";

  const config: Config = {
    content: [
      "./components/**/*.{js,ts,jsx,tsx}",
      "./app/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        typography: {
          DEFAULT: {
            css: {
              maxWidth: "none",
              color: "#000000",
              a: {
                color: "#0066cc",
                textDecoration: "underline",
                fontWeight: "500",
              },
              h1: {
                color: "#000000",
                fontWeight: "800",
              },
              h2: {
                color: "#000000",
                fontWeight: "700",
              },
              h3: {
                color: "#000000",
                fontWeight: "600",
              },
              strong: {
                color: "#000000",
              },
              code: {
                color: "#000000",
              },
            },
          },
        },
      },
    },
    plugins: [require("@tailwindcss/typography")],
  };
  export default config;
  ```

### 2.5 환경 변수 설정 (선택)
- [ ] `.env` 파일 생성 (Notion 연동 시)
  ```env
  NOTION_API_KEY=your_key_here
  NOTION_DATABASE_ID=your_database_id_here
  ```

---

## 3️⃣ 3단계: 핵심 라이브러리 구현 (1시간)

### 3.1 Reviews 라이브러리 구현
- [ ] `lib/reviews.ts` 파일 생성
  ```typescript
  import fs from "fs";
  import path from "path";
  import matter from "gray-matter";
  import readingTime from "reading-time";

  const reviewsDirectory = path.join(process.cwd(), "content/reviews");

  export interface Review {
    slug: string;
    title: string;
    date: string;
    excerpt: string;
    content: string;
    readingTime: string;
    lightColor: string;
    darkColor: string;
    category?: string;
    rating?: number;
    product?: string;
  }

  export function getSortedReviewsData(): Review[] {
    if (!fs.existsSync(reviewsDirectory)) {
      return [];
    }

    const fileNames = fs.readdirSync(reviewsDirectory);
    const allReviewsData = fileNames
      .filter((fileName) => fileName.endsWith(".md") || fileName.endsWith(".mdx"))
      .map((fileName) => {
        const slug = fileName.replace(/\.mdx?$/, "");
        const fullPath = path.join(reviewsDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, "utf8");
        const { data, content } = matter(fileContents);

        const contentWithoutTitle = content.replace(/^#\s+.+\n*/m, '').trim();
        const stats = readingTime(contentWithoutTitle);

        return {
          slug,
          title: data.title || slug,
          date: data.date || "",
          excerpt: data.excerpt || "",
          content: contentWithoutTitle,
          readingTime: stats.text,
          lightColor: data.lightColor || "lab(62.926 59.277 -1.573)",
          darkColor: data.darkColor || "lab(80.993 32.329 -7.093)",
          category: data.category || "기타",
          rating: data.rating || 0,
          product: data.product || "",
        };
      });

    return allReviewsData.sort((a, b) => {
      if (a.date < b.date) return 1;
      else return -1;
    });
  }

  export function getReviewBySlug(slug: string): Review | null {
    try {
      const decodedSlug = decodeURIComponent(slug);
      const fullPath = path.join(reviewsDirectory, `${decodedSlug}.md`);
      let fileContents;

      if (fs.existsSync(fullPath)) {
        fileContents = fs.readFileSync(fullPath, "utf8");
      } else {
        const mdxPath = path.join(reviewsDirectory, `${decodedSlug}.mdx`);
        if (fs.existsSync(mdxPath)) {
          fileContents = fs.readFileSync(mdxPath, "utf8");
        } else {
          return null;
        }
      }

      const { data, content } = matter(fileContents);
      const contentWithoutTitle = content.replace(/^#\s+.+\n*/m, '').trim();
      const stats = readingTime(contentWithoutTitle);

      return {
        slug: decodedSlug,
        title: data.title || decodedSlug,
        date: data.date || "",
        excerpt: data.excerpt || "",
        content: contentWithoutTitle,
        readingTime: stats.text,
        lightColor: data.lightColor || "lab(62.926 59.277 -1.573)",
        darkColor: data.darkColor || "lab(80.993 32.329 -7.093)",
        category: data.category || "기타",
        rating: data.rating || 0,
        product: data.product || "",
      };
    } catch (error) {
      console.error(`Error loading review ${slug}:`, error);
      return null;
    }
  }
  ```

### 3.2 QnA 유틸리티 구현
- [ ] `lib/qna-utils.ts` 파일 생성
  ```typescript
  export interface QnAItem {
    question: string;
    answer: string;
  }

  export function extractQnA(content: string): QnAItem[] {
    const items: QnAItem[] = [];
    const lines = content.split('\n');

    let currentQuestion = '';
    let currentAnswer = '';
    let inQnA = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.match(/^##.*Q&?A|^##.*질문/i)) {
        inQnA = true;
        continue;
      }

      if (inQnA && (line.startsWith('## ') || line === '---')) {
        if (currentQuestion && currentAnswer) {
          items.push({
            question: currentQuestion.replace(/^\*\*Q\.\s*|\*\*$/g, '').trim(),
            answer: currentAnswer.replace(/^A\.\s*/g, '').trim()
          });
        }
        if (line.startsWith('## ')) {
          inQnA = false;
        }
        break;
      }

      if (inQnA && line.match(/^\*\*Q\./)) {
        if (currentQuestion && currentAnswer) {
          items.push({
            question: currentQuestion.replace(/^\*\*Q\.\s*|\*\*$/g, '').trim(),
            answer: currentAnswer.replace(/^A\.\s*/g, '').trim()
          });
        }
        currentQuestion = line;
        currentAnswer = '';
        continue;
      }

      if (inQnA && line.match(/^A\./)) {
        currentAnswer = line;
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine === '' || nextLine.match(/^\*\*Q\./)) {
            break;
          }
          currentAnswer += ' ' + nextLine;
          i = j;
        }
      }
    }

    if (currentQuestion && currentAnswer) {
      items.push({
        question: currentQuestion.replace(/^\*\*Q\.\s*|\*\*$/g, '').trim(),
        answer: currentAnswer.replace(/^A\.\s*/g, '').trim()
      });
    }

    return items;
  }

  export function removeQnASection(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let inQnA = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.match(/^##.*Q&?A|^##.*질문/i)) {
        inQnA = true;
        continue;
      }

      if (inQnA && (trimmed.startsWith('## ') || trimmed === '---')) {
        if (trimmed === '---') continue;
        inQnA = false;
      }

      if (!inQnA) {
        result.push(line);
      }
    }

    return result.join('\n');
  }
  ```

---

## 4️⃣ 4단계: UI 컴포넌트 구현 (2시간)

### 4.1 기본 스타일 설정
- [ ] `app/globals.css` 작성
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  :root {
    --bg: #ffffff;
    --text: #000000;
    --lightLink: #0066cc;
    --darkLink: #0052a3;
  }

  * {
    box-sizing: border-box;
    padding: 0;
    margin: 0;
  }

  html,
  body {
    max-width: 100vw;
    overflow-x: hidden;
  }

  body {
    color: var(--text);
    background: var(--bg);
    font-family: 'Nanum Gothic', 'Malgun Gothic', 'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    line-height: 1.7;
    word-break: keep-all;
  }

  a {
    color: inherit;
    text-decoration: none;
  }
  ```

### 4.2 Link 컴포넌트
- [ ] `components/Link.tsx` 생성
  ```typescript
  import NextLink from "next/link";

  interface LinkProps {
    href: string;
    children: React.ReactNode;
    className?: string;
  }

  export default function Link({ href, children, className }: LinkProps) {
    return (
      <NextLink
        href={href}
        className={`text-[#0066cc] hover:underline ${className || ""}`}
      >
        {children}
      </NextLink>
    );
  }
  ```

### 4.3 Header 컴포넌트
- [ ] `components/Header.tsx` 생성
  ```typescript
  import Link from "./Link";
  import Image from "next/image";

  export default function Header() {
    return (
      <header className="mb-14 flex flex-row place-content-between">
        <div className="flex items-center gap-3">
          <a
            href="https://techreviewlabs.xyz"
            className="inline-block"
          >
            <Image
              src="/logo.png"
              alt="TechReviewLabs"
              width={200}
              height={50}
              priority
              className="h-auto w-[140px]"
            />
          </a>
          <span className="text-gray-400 text-2xl">|</span>
          <a
            href="https://techreviewlabs.xyz"
            className="text-2xl font-semibold hover:opacity-70 transition-opacity"
          >
            Tech Reviews
          </a>
        </div>
      </header>
    );
  }
  ```

### 4.4 ReviewCard 컴포넌트
- [ ] `components/ReviewCard.tsx` 생성
  ```typescript
  import Link from "./Link";

  interface ReviewCardProps {
    title: string;
    date: string;
    excerpt: string;
    slug: string;
    lightColor: string;
    darkColor: string;
    category?: string;
    rating?: number;
  }

  export default function ReviewCard({
    title,
    date,
    excerpt,
    slug,
    lightColor,
    category,
    rating,
  }: ReviewCardProps) {
    return (
      <Link
        className="block py-4"
        href={`/${slug}`}
      >
        <article>
          <div className="flex items-center gap-2 mb-2">
            {category && (
              <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                {category}
              </span>
            )}
            {rating && rating > 0 && (
              <span className="text-xs text-yellow-600">
                ★ {rating.toFixed(1)}
              </span>
            )}
          </div>
          <h2
            className="text-[28px] font-black leading-none mb-2"
            style={{ color: lightColor }}
          >
            {title}
          </h2>
          <p className="text-[13px] text-gray-700">{date}</p>
          <p className="mt-1">{excerpt}</p>
        </article>
      </Link>
    );
  }
  ```

### 4.5 QnA 컴포넌트
- [ ] `components/QnA.tsx` 생성 (196줄 - 이전 Read 결과 참조)

### 4.6 TableOfContents 컴포넌트
- [ ] `components/TableOfContents.tsx` 생성 (196줄 - 이전 Read 결과 참조)

---

## 5️⃣ 5단계: 페이지 구현 (1.5시간)

### 5.1 루트 레이아웃
- [ ] `app/layout.tsx` 작성
  ```typescript
  import type { Metadata, Viewport } from "next";
  import "./globals.css";

  export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  };

  export const metadata: Metadata = {
    title: "TechReviewLabs - 전문 전자기기 리뷰",
    description: "스마트폰, 노트북, 태블릿, 이어폰 등 최신 전자기기에 대한 심층 리뷰와 비교 분석을 제공합니다.",
    metadataBase: new URL("https://techreviewlabs.xyz"),
    openGraph: {
      title: "TechReviewLabs - 전문 전자기기 리뷰",
      description: "스마트폰, 노트북, 태블릿, 이어폰 등 최신 전자기기에 대한 심층 리뷰와 비교 분석을 제공합니다.",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "TechReviewLabs - 전문 전자기기 리뷰",
      description: "스마트폰, 노트북, 태블릿, 이어폰 등 최신 전자기기에 대한 심층 리뷰와 비교 분석을 제공합니다.",
    },
  };

  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "TechReviewLabs",
      "alternateName": "테크리뷰랩스",
      "url": "https://techreviewlabs.xyz",
      "description": "전자기기 리뷰 전문 사이트",
    };

    return (
      <html lang="ko">
        <head>
          <meta name="naver-site-verification" content="YOUR_VERIFICATION_CODE" />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
          />
          <script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA_ID"></script>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'YOUR_GA_ID');
              `,
            }}
          />
        </head>
        <body className="mx-auto max-w-2xl bg-white px-5 py-12 text-black">
          {children}
        </body>
      </html>
    );
  }
  ```

### 5.2 메인 페이지
- [ ] `app/page.tsx` 작성
  ```typescript
  import Header from "@/components/Header";
  import ReviewCard from "@/components/ReviewCard";
  import { getSortedReviewsData } from "@/lib/reviews";

  export default function Home() {
    const reviews = getSortedReviewsData();

    return (
      <>
        <Header />
        <main>
          <div className="relative -top-[10px] flex flex-col gap-8">
            {reviews.length === 0 ? (
              <p>No reviews yet. Create your first review in content/reviews/</p>
            ) : (
              reviews.map((review) => (
                <ReviewCard key={review.slug} {...review} />
              ))
            )}
          </div>
        </main>
      </>
    );
  }
  ```

### 5.3 동적 포스트 페이지
- [ ] `app/[slug]/page.tsx` 작성 (122줄 - 이전 Read 결과 참조)

### 5.4 Robots.txt
- [ ] `app/robots.ts` 작성
  ```typescript
  import { MetadataRoute } from "next";

  export default function robots(): MetadataRoute.Robots {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
      },
      sitemap: "https://techreviewlabs.xyz/sitemap.xml",
    };
  }
  ```

### 5.5 Sitemap
- [ ] `app/sitemap.ts` 작성
  ```typescript
  import { MetadataRoute } from "next";
  import { getSortedReviewsData } from "@/lib/reviews";

  export default function sitemap(): MetadataRoute.Sitemap {
    const reviews = getSortedReviewsData();
    const baseUrl = "https://techreviewlabs.xyz";

    const reviewUrls = reviews.map((review) => ({
      url: `${baseUrl}/${review.slug}`,
      lastModified: new Date(review.date),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1,
      },
      ...reviewUrls,
    ];
  }
  ```

---

## 5️⃣-A 보너스: 이미지 최적화 실전 가이드 (30분)

### 5A.1 이미지 포맷 변환 도구 설치
- [ ] ImageMagick 설치 (권장)
  ```bash
  # macOS
  brew install imagemagick

  # Ubuntu/Debian
  sudo apt-get install imagemagick

  # Windows
  # https://imagemagick.org/script/download.php
  ```

- [ ] 또는 Sharp 설치 (Node.js)
  ```bash
  npm install -D sharp
  ```

### 5A.2 JPG/PNG → WebP 변환
- [ ] ImageMagick으로 단일 파일 변환
  ```bash
  magick convert input.jpg -quality 85 output.webp
  ```

- [ ] 여러 파일 일괄 변환
  ```bash
  # 현재 디렉토리의 모든 JPG 파일
  for file in *.jpg; do
    magick convert "$file" -quality 85 "${file%.jpg}.webp"
  done

  # PNG도 변환
  for file in *.png; do
    magick convert "$file" -quality 85 "${file%.png}.webp"
  done
  ```

### 5A.3 AVIF 포맷 생성 (최신 포맷)
- [ ] AVIF 변환 (더 작은 파일 크기)
  ```bash
  magick convert input.jpg -quality 75 output.avif
  ```

### 5A.4 이미지 리사이즈 (과도한 해상도 방지)
- [ ] 최대 너비 1920px로 리사이즈
  ```bash
  magick convert input.jpg -resize 1920x\> -quality 85 output.jpg
  ```

- [ ] 썸네일 생성 (640px)
  ```bash
  magick convert input.jpg -resize 640x\> -quality 80 thumbnail.webp
  ```

### 5A.5 Sharp 스크립트로 자동화
- [ ] `scripts/optimize-images.js` 생성
  ```javascript
  const sharp = require('sharp');
  const fs = require('fs');
  const path = require('path');

  const inputDir = './public/images/original';
  const outputDir = './public/images/optimized';

  // 출력 디렉토리 생성
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.readdirSync(inputDir).forEach(file => {
    if (file.match(/\.(jpg|jpeg|png)$/i)) {
      const input = path.join(inputDir, file);
      const name = path.parse(file).name;

      console.log(`Processing ${file}...`);

      // WebP 변환
      sharp(input)
        .webp({ quality: 85 })
        .toFile(path.join(outputDir, `${name}.webp`))
        .then(() => console.log(`✓ ${name}.webp`));

      // AVIF 변환
      sharp(input)
        .avif({ quality: 75 })
        .toFile(path.join(outputDir, `${name}.avif`))
        .then(() => console.log(`✓ ${name}.avif`));

      // 리사이즈 + JPG 최적화
      sharp(input)
        .resize(1920, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality: 85, progressive: true })
        .toFile(path.join(outputDir, `${name}.jpg`))
        .then(() => console.log(`✓ ${name}.jpg`));
    }
  });
  ```

- [ ] package.json에 스크립트 추가
  ```json
  {
    "scripts": {
      "optimize-images": "node scripts/optimize-images.js"
    }
  }
  ```

- [ ] 이미지 최적화 실행
  ```bash
  npm run optimize-images
  ```

### 5A.6 이미지 사용 가이드라인
- [ ] 이미지 크기 기준 설정
  ```yaml
  히어로 이미지: 1920×1080, WebP 85%, 목표 < 150KB
  썸네일: 640×360, WebP 80%, 목표 < 50KB
  로고: PNG 또는 SVG, 목표 < 50KB
  OG 이미지: 1200×630, JPG 90%, 목표 < 100KB
  ```

- [ ] Next.js Image 컴포넌트 사용 체크
  ```typescript
  // ✓ 로컬 이미지 (우선순위 높음)
  <Image
    src="/hero.webp"
    alt="설명"
    width={1920}
    height={1080}
    priority        // LCP 이미지
    quality={90}
  />

  // ✓ 일반 이미지 (Lazy loading)
  <Image
    src="/thumbnail.webp"
    alt="설명"
    width={640}
    height={360}
    loading="lazy"
  />
  ```

---

## 5️⃣-B 보너스: 폰트 최적화 실전 가이드 (20분)

### 5B.1 시스템 폰트 스택 적용 (권장)
- [ ] `app/globals.css` 폰트 설정 확인
  ```css
  body {
    font-family:
      'Nanum Gothic',           /* 나눔고딕 우선 */
      'Malgun Gothic',          /* 윈도우 */
      'Apple SD Gothic Neo',    /* macOS/iOS */
      -apple-system,
      BlinkMacSystemFont,
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  ```

**장점:**
- ✅ 0ms 로딩 시간
- ✅ CLS (레이아웃 시프트) 제로
- ✅ 네트워크 요청 없음

### 5B.2 웹 폰트 사용 시 (선택)

#### Google Fonts 최적화
- [ ] Next.js Font 사용
  ```bash
  # 이미 Next.js에 내장됨
  ```

- [ ] `app/layout.tsx` 수정
  ```typescript
  import { Noto_Sans_KR } from 'next/font/google';

  const notoSansKR = Noto_Sans_KR({
    weight: ['400', '700'],       // 필요한 굵기만
    subsets: ['latin'],           // latin (한글 자동 포함)
    display: 'swap',              // FOUT 방지
    preload: true,
    fallback: ['system-ui', 'arial'],
    adjustFontFallback: true,     // 폴백 크기 자동 조정
    variable: '--font-noto',
  });

  // 적용
  <body className={notoSansKR.className}>
  ```

#### 폰트 서브셋팅 (고급)
- [ ] pyftsubset 설치
  ```bash
  pip install fonttools brotli
  ```

- [ ] 한글만 추출
  ```bash
  pyftsubset NotoSansKR-Regular.otf \
    --unicodes="U+AC00-U+D7A3" \
    --output-file="NotoSansKR-KR.woff2" \
    --flavor=woff2 \
    --layout-features='*' \
    --name-IDs='*'
  ```

- [ ] 서브셋 폰트를 `public/fonts/`에 저장

- [ ] CSS에서 사용
  ```css
  @font-face {
    font-family: 'Noto Sans KR';
    src: url('/fonts/NotoSansKR-KR.woff2') format('woff2');
    font-display: swap;
    font-weight: 400;
    unicode-range: U+AC00-U+D7A3; /* 한글 완성형만 */
  }
  ```

- [ ] Preload 추가
  ```tsx
  // app/layout.tsx <head> 안에
  <link
    rel="preload"
    href="/fonts/NotoSansKR-KR.woff2"
    as="font"
    type="font/woff2"
    crossOrigin="anonymous"
  />
  ```

### 5B.3 폰트 로딩 전략 확인
- [ ] font-display 값 확인
  ```yaml
  swap: 폴백 폰트 먼저 표시, 웹 폰트 로드 후 교체 (권장)
  block: 웹 폰트 로드까지 대기 (3초)
  fallback: 100ms 대기, 없으면 폴백 사용
  optional: 즉시 폴백, 웹 폰트는 캐시용
  ```

- [ ] CLS (Cumulative Layout Shift) 최소화
  - `adjustFontFallback: true` 사용
  - 또는 폴백 폰트와 크기 맞추기

---

## 6️⃣ 6단계: 콘텐츠 작성 (30분)

### 6.1 첫 번째 리뷰 작성
- [ ] `content/reviews/example-review.md` 생성
  ```markdown
  ---
  title: "아이폰 15 Pro 리뷰"
  date: "2025-01-09"
  excerpt: "애플의 최신 플래그십 스마트폰, 아이폰 15 Pro에 대한 심층 리뷰입니다."
  category: "스마트폰"
  rating: 4.5
  product: "Apple iPhone 15 Pro"
  lightColor: "lab(62.926 59.277 -1.573)"
  darkColor: "lab(80.993 32.329 -7.093)"
  ---

  # 아이폰 15 Pro 리뷰

  ## 디자인 및 빌드 퀄리티

  티타늄 프레임으로 무게가 크게 줄어들었습니다.

  ## 성능

  A17 Pro 칩셋은 압도적인 성능을 제공합니다.

  ## Q&A

  **Q. 배터리 수명은 어떤가요?**
  A. 중간 사용 기준 하루 종일 사용 가능합니다.

  **Q. 카메라 성능은?**
  A. 특히 저조도 환경에서 뛰어난 성능을 보여줍니다.
  ```

### 6.2 로고 이미지 추가
- [ ] `public/logo.png` 파일 준비 (TechReviewLabs 로고)

---

## 7️⃣ 7단계: 테스트 및 빌드 (30분)

### 7.1 개발 서버 실행
- [ ] 개발 서버 시작
  ```bash
  npm run dev
  ```
- [ ] 브라우저에서 `http://localhost:3000` 확인
- [ ] 메인 페이지 정상 작동 확인
- [ ] 포스트 페이지 정상 작동 확인
- [ ] 목차(TOC) 기능 테스트
- [ ] Q&A 섹션 테스트
- [ ] 모바일 반응형 테스트

### 7.2 프로덕션 빌드
- [ ] 빌드 실행
  ```bash
  npm run build
  ```
- [ ] 빌드 성공 확인
- [ ] 빌드 결과 확인 (JavaScript 번들 크기 등)

### 7.3 로컬 프로덕션 테스트
- [ ] 프로덕션 서버 시작
  ```bash
  npm start
  ```
- [ ] 모든 페이지 정상 작동 확인

---

## 8️⃣ 8단계: Git 및 배포 (30분)

### 8.1 Git 저장소 초기화
- [ ] Git 저장소 초기화
  ```bash
  git init
  ```
- [ ] `.gitignore` 파일 확인 (Next.js가 자동 생성)
- [ ] 첫 커밋
  ```bash
  git add .
  git commit -m "Initial commit: 에이정 블로그 완성"
  ```

### 8.2 GitHub 저장소 연결
- [ ] GitHub에서 새 저장소 생성
- [ ] 원격 저장소 연결
  ```bash
  git remote add origin https://github.com/YOUR_USERNAME/techreviewlabs.git
  git branch -M main
  git push -u origin main
  ```

### 8.3 Vercel 배포
- [ ] [Vercel](https://vercel.com) 계정 로그인
- [ ] GitHub 저장소 연동
- [ ] 프로젝트 Import
- [ ] 환경 변수 설정 (필요 시)
  - `NEXT_PUBLIC_GA_ID`
  - `NEXT_PUBLIC_SITE_URL`
- [ ] 배포 완료 대기
- [ ] 배포된 URL 확인

### 8.4 도메인 연결
- [ ] Vercel에서 Custom Domain 설정
- [ ] DNS 설정 (techreviewlabs.xyz)
  - A 레코드: `76.76.21.21`
  - 또는 CNAME: `cname.vercel-dns.com`
- [ ] SSL 인증서 자동 발급 확인

---

## 9️⃣ 9단계: SEO 최적화 완전판 (1시간)

### 9.1 메타데이터 고도화
- [ ] Open Graph 이미지 생성
  ```yaml
  크기: 1200×630 픽셀
  포맷: JPG (90% 품질)
  파일명: /public/og-image.jpg
  용량: < 100KB
  ```

- [ ] `app/layout.tsx` 메타데이터 확인
  ```typescript
  export const metadata: Metadata = {
    metadataBase: new URL('https://techreviewlabs.xyz'),
    title: {
      default: 'TechReviewLabs - 전문 전자기기 리뷰',
      template: '%s — TechReviewLabs',
    },
    description: '스마트폰, 노트북, 태블릿, 이어폰 등 최신 전자기기에 대한 심층 리뷰와 비교 분석을 제공합니다.',
    keywords: ['스마트폰 리뷰', '노트북 리뷰', '태블릿 리뷰', '이어폰 리뷰', '전자기기', '테크 리뷰'],
    authors: [{ name: 'TechReviewLabs' }],
    creator: 'TechReviewLabs',
    publisher: 'TechReviewLabs',
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      url: 'https://techreviewlabs.xyz',
      siteName: 'TechReviewLabs',
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'TechReviewLabs - 전자기기 리뷰',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/og-image.jpg'],
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
  };
  ```

- [ ] 개별 리뷰 메타데이터 확인 (`app/[slug]/page.tsx`)
  ```typescript
  export async function generateMetadata({ params }: Props) {
    const review = getReviewBySlug(params.slug);
    return {
      title: review.title,
      description: review.excerpt,
      openGraph: {
        title: review.title,
        description: review.excerpt,
        type: 'article',
        publishedTime: review.date,
        authors: ['TechReviewLabs'],
      },
    };
  }
  ```

### 9.2 구조화된 데이터 (JSON-LD)
- [ ] 웹사이트 스키마 추가됨 확인
  ```javascript
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'TechReviewLabs',
    url: 'https://techreviewlabs.xyz',
    description: '전자기기 리뷰 전문 사이트',
    publisher: {
      '@type': 'Organization',
      name: 'TechReviewLabs',
      logo: 'https://techreviewlabs.xyz/logo.png',
    },
  };
  ```

- [ ] 개별 리뷰에 Product + Review 스키마 추가 (SEO 최적화)
  ```typescript
  // app/[slug]/page.tsx
  const reviewSchema = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Product',
      name: review.product,
      category: review.category,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: 5,
    },
    author: {
      '@type': 'Organization',
      name: 'TechReviewLabs',
    },
    datePublished: review.date,
    reviewBody: review.excerpt,
  };

  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
  />
  ```

### 9.3 Google Search Console 등록
- [ ] [Google Search Console](https://search.google.com/search-console) 접속
- [ ] "속성 추가" 클릭
- [ ] URL 접두어: `https://techreviewlabs.xyz` 입력
- [ ] 소유권 확인 방법 선택
  - **HTML 태그 방법 (권장)**:
    1. 메타 태그 복사
    2. `app/layout.tsx`의 `<head>`에 추가
       ```tsx
       <meta name="google-site-verification" content="YOUR_CODE" />
       ```
    3. 배포 후 "확인" 클릭

- [ ] Sitemap 제출
  1. 좌측 메뉴 "Sitemaps" 클릭
  2. `https://techreviewlabs.xyz/sitemap.xml` 입력
  3. "제출" 클릭
  4. 상태가 "성공"으로 변경될 때까지 대기 (보통 1-3일)

- [ ] URL 검사 도구로 색인 요청
  1. 상단 검색창에 메인 URL 입력
  2. "색인 생성 요청" 클릭

### 9.4 네이버 서치어드바이저 등록
- [ ] [네이버 서치어드바이저](https://searchadvisor.naver.com) 로그인
- [ ] "웹마스터 도구" → "사이트 등록"
- [ ] `https://techreviewlabs.xyz` 입력
- [ ] 소유 확인
  - **HTML 태그 방식**:
    1. 인증 메타 태그 복사
    2. `app/layout.tsx`에 추가
       ```tsx
       <meta name="naver-site-verification" content="YOUR_CODE" />
       ```
    3. 배포 후 "확인" 클릭

- [ ] 사이트 간단 체크 실행
- [ ] RSS 제출 (선택)
- [ ] 사이트맵 제출
  - URL: `https://techreviewlabs.xyz/sitemap.xml`

### 9.5 Google Analytics 4 연동
- [ ] [Google Analytics](https://analytics.google.com) 접속
- [ ] "관리" → "계정 만들기"
- [ ] GA4 속성 생성
  - 속성 이름: "TechReviewLabs"
  - 보고 시간대: "대한민국"
  - 통화: "대한민국 원"

- [ ] 데이터 스트림 설정
  - 플랫폼: "웹"
  - 웹사이트 URL: `https://techreviewlabs.xyz`
  - 스트림 이름: "TechReviewLabs"

- [ ] 측정 ID 복사 (G-XXXXXXXXXX)

- [ ] `app/layout.tsx`에 gtag 추가
  ```tsx
  <head>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
    <script
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-XXXXXXXXXX');
        `,
      }}
    />
  </head>
  ```

- [ ] 환경 변수로 관리 (선택)
  ```env
  # .env
  NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
  ```

  ```tsx
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}></script>
  ```

- [ ] 실시간 보고서에서 데이터 확인 (1-2시간 소요)

### 9.6 Sitemap 자동 생성 확인
- [ ] `app/sitemap.ts` 파일 존재 확인
- [ ] 브라우저에서 `/sitemap.xml` 접속
- [ ] 모든 포스트 URL 포함 확인
- [ ] `lastModified` 날짜 정확성 확인

### 9.7 Robots.txt 확인
- [ ] `app/robots.ts` 파일 존재 확인
- [ ] 브라우저에서 `/robots.txt` 접속
- [ ] 내용 확인:
  ```
  User-Agent: *
  Allow: /
  Sitemap: https://blog.aijeong.com/sitemap.xml
  ```

### 9.8 Canonical URL 설정
- [ ] 개별 포스트에 canonical 추가 확인
  ```typescript
  // app/[slug]/page.tsx
  export async function generateMetadata({ params }: Props) {
    const url = `https://blog.aijeong.com/${params.slug}`;
    return {
      alternates: {
        canonical: url,  // 중복 콘텐츠 방지
      },
    };
  }
  ```

### 9.9 보안 헤더 설정 (선택)
- [ ] `next.config.ts`에 보안 헤더 추가
  ```typescript
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  }
  ```

---

## 🔟 10단계: 성능 최적화 검증 (30분)

### 10.1 PageSpeed Insights 테스트
- [ ] [PageSpeed Insights](https://pagespeed.web.dev/) 접속
- [ ] 배포된 URL 입력
- [ ] 모바일 성능 점수 확인 (목표: 90+)
- [ ] 데스크톱 성능 점수 확인 (목표: 95+)

### 10.2 Lighthouse 검사
- [ ] Chrome DevTools > Lighthouse 실행
- [ ] Performance, Accessibility, Best Practices, SEO 점수 확인
- [ ] 개선 권장사항 확인 및 적용

### 10.3 최종 체크리스트
- [ ] 모든 이미지 최적화 (WebP/AVIF)
- [ ] 불필요한 JavaScript 제거
- [ ] CSS 최적화 (Critters)
- [ ] 폰트 로딩 최적화
- [ ] Lazy Loading 적용
- [ ] 캐싱 전략 확인

---

## ✅ 완료 체크리스트

### 필수 기능
- [ ] 리뷰 메인 페이지 정상 작동
- [ ] 개별 리뷰 페이지 정상 작동
- [ ] Markdown 렌더링 정상
- [ ] 한글 URL 지원
- [ ] 목차(TOC) 기능
- [ ] Q&A 컴포넌트
- [ ] 제품 평점 표시
- [ ] 카테고리 태그
- [ ] 반응형 디자인
- [ ] SEO 메타데이터 (Product + Review 스키마)

### 성능
- [ ] Lighthouse Performance 90+
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.0s
- [ ] Total Blocking Time < 50ms
- [ ] Cumulative Layout Shift < 0.1

### 배포 및 SEO
- [ ] Vercel 배포 완료
- [ ] 도메인 연결 완료
- [ ] Google Search Console 등록
- [ ] 네이버 서치어드바이저 등록
- [ ] Google Analytics 연동
- [ ] Sitemap 제출

---

## 📚 추가 개선 사항 (선택)

- [ ] RSS Feed 생성
- [ ] 검색 기능 추가
- [ ] 태그 시스템 구현
- [ ] 댓글 시스템 (Giscus 등)
- [ ] 다크모드 토글
- [ ] 이전/다음 포스트 네비게이션
- [ ] 관련 포스트 추천
- [ ] 소셜 공유 버튼
- [ ] 읽기 진행률 표시
- [ ] Notion 데이터베이스 자동 동기화

---

## 🎯 최종 목표

✅ **완성된 테크 리뷰 사이트의 특징**
- ⚡ 초고속 로딩 (Lighthouse 97+)
- 📱 스마트폰, 노트북, 태블릿, 이어폰 등 전자기기 리뷰
- 🎨 미니멀하고 깔끔한 디자인
- 📱 완벽한 반응형
- 🇰🇷 한글 완벽 지원
- 🔍 SEO 최적화 (Product + Review 스키마)
- ⭐ 제품 평점 시스템
- 🏷️ 카테고리별 분류
- ♿ 접근성 우수
- 🚀 확장 가능한 구조

---

**개발 완료 예상 시간: 약 6-7시간**

각 단계를 완료할 때마다 체크박스를 표시하고, 문제가 발생하면 해당 섹션으로 돌아가 다시 확인하세요!
