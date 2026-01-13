import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

const reviewsDirectory = path.join(process.cwd(), "content/reviews");

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDate(date: string): string {
  if (!date) return "";
  return date.split("T")[0];
}

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
        date: formatDate(data.date || ""),
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
      date: formatDate(data.date || ""),
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
