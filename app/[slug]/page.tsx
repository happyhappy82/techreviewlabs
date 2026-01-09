import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Header from "@/components/Header";
import TableOfContents from "@/components/TableOfContents";
import QnA from "@/components/QnA";
import { getReviewBySlug, getSortedReviewsData } from "@/lib/reviews";
import { extractQnA, removeQnASection } from "@/lib/qna-utils";
import type { Metadata } from "next";

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

  const url = `https://techreviewlabs.xyz/${slug}`;

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
      authors: ["TechReviewLabs"],
    },
    twitter: {
      card: "summary_large_image",
      title: review.title,
      description: review.excerpt,
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

  const reviewSchema = {
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
    },
    publisher: {
      "@type": "Organization",
      name: "TechReviewLabs",
    },
    datePublished: review.date,
    reviewBody: review.excerpt,
  };

  return (
    <>
      <Header />
      <article className="relative">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
        />

        <div className="mb-8">
          <h1
            className="text-[42px] font-black leading-tight mb-4"
            style={{ color: review.lightColor }}
          >
            {review.title}
          </h1>
          <div className="flex gap-4 text-sm text-gray-600">
            <time dateTime={review.date}>{review.date}</time>
            <span>{review.readingTime}</span>
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ node, ...props }) => {
                const text = props.children?.toString() || "";
                const id = text.toLowerCase().replace(/\s+/g, "-");
                return <h2 id={id} {...props} />;
              },
              h3: ({ node, ...props }) => {
                const text = props.children?.toString() || "";
                const id = text.toLowerCase().replace(/\s+/g, "-");
                return <h3 id={id} {...props} />;
              },
            }}
          >
            {contentWithoutQnA}
          </ReactMarkdown>
        </div>

        <QnA items={qnaItems} />
        <TableOfContents />
      </article>
    </>
  );
}
