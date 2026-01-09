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
          <div className="text-2xl font-bold">TechReviewLabs</div>
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
