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
  keywords: ["스마트폰 리뷰", "노트북 리뷰", "태블릿 리뷰", "이어폰 리뷰", "전자기기", "테크 리뷰", "가젯 리뷰"],
  authors: [{ name: "TechReviewLabs" }],
  creator: "TechReviewLabs",
  publisher: "TechReviewLabs",
  openGraph: {
    title: "TechReviewLabs - 전문 전자기기 리뷰",
    description: "스마트폰, 노트북, 태블릿, 이어폰 등 최신 전자기기에 대한 심층 리뷰와 비교 분석을 제공합니다.",
    type: "website",
    locale: "ko_KR",
    url: "https://techreviewlabs.xyz",
    siteName: "TechReviewLabs",
  },
  twitter: {
    card: "summary_large_image",
    title: "TechReviewLabs - 전문 전자기기 리뷰",
    description: "스마트폰, 노트북, 태블릿, 이어폰 등 최신 전자기기에 대한 심층 리뷰와 비교 분석을 제공합니다.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="mx-auto max-w-2xl bg-white px-5 py-12 text-black">
        {children}
      </body>
    </html>
  );
}
