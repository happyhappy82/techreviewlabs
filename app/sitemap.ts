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
