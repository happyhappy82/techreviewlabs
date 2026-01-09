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
