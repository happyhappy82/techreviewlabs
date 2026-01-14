import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "테크리뷰Lab",
  description: "전자제품, 테크제품 등 관련 상품 및 쇼핑정보를 공유하는 사이트입니다. 최신 IT 제품정보를 꼼꼼하게 제공해드립니다.",
  metadataBase: new URL("https://www.techreviewlab.xyz"),
  keywords: ["스마트폰 리뷰", "노트북 리뷰", "태블릿 리뷰", "이어폰 리뷰", "전자기기", "테크 리뷰", "가젯 리뷰"],
  authors: [{ name: "TechReviewLabs" }],
  creator: "TechReviewLabs",
  publisher: "TechReviewLabs",
  alternates: {
    canonical: "https://www.techreviewlab.xyz",
  },
  verification: {
    google: "LUA8o3zeFLpEIqCY81Haa50ZacoubJgXjCLoeWWkwvA",
    other: {
      "naver-site-verification": "e2de8fcfde3eb494012924feab35d8349ba12e7d",
    },
  },
  openGraph: {
    title: "테크리뷰Lab",
    description: "전자제품, 테크제품 등 관련 상품 및 쇼핑정보를 공유하는 사이트입니다. 최신 IT 제품정보를 꼼꼼하게 제공해드립니다.",
    type: "website",
    locale: "ko_KR",
    url: "https://www.techreviewlab.xyz",
    siteName: "테크리뷰Lab",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "테크리뷰Lab - 전자제품 리뷰 사이트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "테크리뷰Lab",
    description: "전자제품, 테크제품 등 관련 상품 및 쇼핑정보를 공유하는 사이트입니다. 최신 IT 제품정보를 꼼꼼하게 제공해드립니다.",
    images: ["/opengraph-image.png"],
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
    "name": "테크리뷰Lab",
    "alternateName": "TechReviewLabs",
    "url": "https://www.techreviewlab.xyz",
    "description": "전자제품, 테크제품 등 관련 상품 및 쇼핑정보를 공유하는 사이트입니다. 최신 IT 제품정보를 꼼꼼하게 제공해드립니다.",
    "publisher": {
      "@type": "Organization",
      "name": "TechReviewLabs",
      "url": "https://www.techreviewlab.xyz",
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "TechReviewLabs",
    "alternateName": "테크리뷰Lab",
    "url": "https://www.techreviewlab.xyz",
    "logo": "https://www.techreviewlab.xyz/logo.png",
    "description": "전자제품, 테크제품 등 관련 상품 및 쇼핑정보를 공유하는 사이트입니다.",
  };

  return (
    <html lang="ko">
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-NSG3V29F');`,
          }}
        />
        {/* End Google Tag Manager */}
        {/* Google Analytics */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-VV6QYJKBH9"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-VV6QYJKBH9');
            `,
          }}
        />
        {/* End Google Analytics */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="mx-auto max-w-2xl bg-white px-5 py-12 text-black">
        {children}
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NSG3V29F"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
      </body>
    </html>
  );
}
