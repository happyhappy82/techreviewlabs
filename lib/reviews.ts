import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import { marked } from "marked";
import { removeQnASection } from "./qna-utils";

// h2, h3에 id 자동 생성
function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// marked 설정: h2, h3에 id와 scroll-mt-20 클래스 추가
const renderer = new marked.Renderer();
renderer.heading = function ({ text, depth }: { text: string; depth: number }) {
  if (depth === 2 || depth === 3) {
    const id = generateId(text);
    return `<h${depth} id="${id}" class="scroll-mt-20">${text}</h${depth}>`;
  }
  return `<h${depth}>${text}</h${depth}>`;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: false,
});

// 마크다운을 HTML로 변환
function markdownToHtml(markdown: string): string {
  return marked.parse(markdown) as string;
}

const reviewsDirectory = path.join(process.cwd(), "content/reviews");

// 날짜를 YYYY-MM-DD 형식으로 변환 (화면 표시용)
function formatDateForDisplay(date: string): string {
  if (!date) return "";
  return date.split("T")[0];
}

// ISO 형식으로 정규화 (SEO용)
function normalizeToISO(date: string): string {
  if (!date) return "";
  // 이미 시간 정보가 있으면 그대로 반환
  if (date.includes("T")) return date;
  // YYYY-MM-DD만 있으면 시간 추가
  return `${date}T00:00:00+09:00`;
}

export interface Review {
  slug: string;
  title: string;
  date: string;          // ISO 형식 (SEO용: OpenGraph, Schema.org)
  displayDate: string;   // YYYY-MM-DD (화면 표시용)
  excerpt: string;
  content: string;       // 원본 마크다운 (QnA 추출용)
  contentHtml: string;   // 빌드타임에 변환된 HTML
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

      const rawDate = data.date || "";
      return {
        slug,
        title: data.title || slug,
        date: normalizeToISO(rawDate),
        displayDate: formatDateForDisplay(rawDate),
        excerpt: data.excerpt || "",
        content: contentWithoutTitle,
        contentHtml: "", // 리스트에서는 HTML 불필요
        readingTime: stats.text,
        lightColor: data.lightColor || "#c53030",
        darkColor: data.darkColor || "#9b2c2c",
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

    // QnA 섹션 제거 후 HTML 변환 (빌드 타임)
    const contentWithoutQnA = removeQnASection(contentWithoutTitle);
    const contentHtml = markdownToHtml(contentWithoutQnA);

    const rawDate = data.date || "";
    return {
      slug: decodedSlug,
      title: data.title || decodedSlug,
      date: normalizeToISO(rawDate),
      displayDate: formatDateForDisplay(rawDate),
      excerpt: data.excerpt || "",
      content: contentWithoutTitle,
      contentHtml,
      readingTime: stats.text,
      lightColor: data.lightColor || "#c53030",
      darkColor: data.darkColor || "#9b2c2c",
      category: data.category || "기타",
      rating: data.rating || 0,
      product: data.product || "",
    };
  } catch (error) {
    console.error(`Error loading review ${slug}:`, error);
    return null;
  }
}
