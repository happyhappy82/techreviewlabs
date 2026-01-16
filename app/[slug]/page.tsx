import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Header from "@/components/Header";
import TableOfContents from "@/components/TableOfContents";
import QnA from "@/components/QnA";
import { getReviewBySlug, getSortedReviewsData } from "@/lib/reviews";
import { extractQnA, removeQnASection } from "@/lib/qna-utils";
import type { Metadata } from "next";
import type { Element } from "hast";

function extractTextFromNode(node: Element): string {
  let text = "";
  for (const child of node.children || []) {
    if (child.type === "text") {
      text += child.value;
    } else if (child.type === "element") {
      text += extractTextFromNode(child as Element);
    }
  }
  return text;
}

function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const reviews = getSortedReviewsData();
  return reviews.map((review) => ({
    slug: review.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const review = getReviewBySlug(slug);

  if (!review) {
    return {
      title: "Not Found",
    };
  }

  const url = `https://www.techreviewlab.xyz/${slug}`;

  return {
    title: review.title,
    description: review.excerpt,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: review.title,
      description: review.excerpt,
      url: url,
      siteName: "TechReviewLabs",
      locale: "ko_KR",
      type: "article",
      publishedTime: review.date,
      modifiedTime: review.date,
      authors: ["TechReviewLabs"],
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
          alt: review.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: review.title,
      description: review.excerpt,
      images: ["/opengraph-image.png"],
    },
  };
}

export default async function ReviewPage({ params }: Props) {
  const { slug } = await params;
  const review = getReviewBySlug(slug);

  if (!review) {
    notFound();
  }

  const qnaItems = extractQnA(review.content);
  const contentWithoutQnA = removeQnASection(review.content);

  const isActualReview = review.product && (review.rating ?? 0) > 0;

  const pageUrl = `https://www.techreviewlab.xyz/${slug}`;

  const mainSchema = isActualReview
    ? {
        "@context": "https://schema.org",
        "@type": "Review",
        itemReviewed: {
          "@type": "Product",
          name: review.product,
          category: review.category,
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: review.rating,
          bestRating: 5,
          worstRating: 1,
        },
        author: {
          "@type": "Organization",
          name: "TechReviewLabs",
          url: "https://www.techreviewlab.xyz",
        },
        publisher: {
          "@type": "Organization",
          name: "TechReviewLabs",
          url: "https://www.techreviewlab.xyz",
          logo: {
            "@type": "ImageObject",
            url: "https://www.techreviewlab.xyz/logo.png",
          },
        },
        datePublished: review.date,
        dateModified: review.date,
        reviewBody: review.excerpt,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": pageUrl,
        },
        image: "https://www.techreviewlab.xyz/opengraph-image.png",
      }
    : {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: review.title,
        description: review.excerpt,
        datePublished: review.date,
        dateModified: review.date,
        author: {
          "@type": "Organization",
          name: "TechReviewLabs",
          url: "https://www.techreviewlab.xyz",
        },
        publisher: {
          "@type": "Organization",
          name: "TechReviewLabs",
          url: "https://www.techreviewlab.xyz",
          logo: {
            "@type": "ImageObject",
            url: "https://www.techreviewlab.xyz/logo.png",
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": pageUrl,
        },
        image: "https://www.techreviewlab.xyz/opengraph-image.png",
      };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "홈",
        item: "https://www.techreviewlab.xyz",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: review.title,
        item: pageUrl,
      },
    ],
  };

  const faqSchema =
    qnaItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: qnaItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null;

  return (
    <>
      <Header />
      <main>
        <article className="relative">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(mainSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        {faqSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
          />
        )}

        <div className="mb-8">
          <h1
            className="text-[42px] font-black leading-tight mb-4"
            style={{ color: review.lightColor }}
          >
            {review.title}
          </h1>
          <div className="flex gap-4 text-sm text-gray-600">
            <time dateTime={review.date}>{review.displayDate}</time>
            <span>{review.readingTime}</span>
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ node, ...props }) => {
                const text = node ? extractTextFromNode(node as Element) : "";
                const id = generateId(text);
                return <h2 id={id} className="scroll-mt-20" {...props} />;
              },
              h3: ({ node, ...props }) => {
                const text = node ? extractTextFromNode(node as Element) : "";
                const id = generateId(text);
                return <h3 id={id} className="scroll-mt-20" {...props} />;
              },
            }}
          >
            {contentWithoutQnA}
          </ReactMarkdown>
        </div>

        <QnA items={qnaItems} />
        <TableOfContents />
      </article>
      </main>
    </>
  );
}
