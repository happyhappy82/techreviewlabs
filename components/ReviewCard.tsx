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
            <span className="text-xs text-amber-700 font-medium">
              ★ {rating.toFixed(1)}
            </span>
          )}
        </div>
        <h2
          className="text-[28px] font-black leading-none mb-2 text-gray-900"
        >
          {title}
        </h2>
        <p className="text-[13px] text-gray-700">{date}</p>
        <p className="mt-1">{excerpt}</p>
      </article>
    </Link>
  );
}
