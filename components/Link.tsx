import NextLink from "next/link";

interface LinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export default function Link({ href, children, className }: LinkProps) {
  return (
    <NextLink
      href={href}
      className={`text-[#0066cc] hover:underline ${className || ""}`}
    >
      {children}
    </NextLink>
  );
}
