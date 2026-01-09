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
          <Image
            src="/logo.png"
            alt="테크리뷰Lab"
            width={200}
            height={60}
            className="h-auto"
            priority
          />
        </a>
      </div>
    </header>
  );
}
