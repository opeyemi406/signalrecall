import React from "react";
import Link from "next/link";

interface LogoMarkProps {
  size?: number;
  className?: string;
  id?: string;
}

export function LogoMark({ size = 26, className = "", id = "srLogoGrad" }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2F6BFF" />
        </linearGradient>
      </defs>
      <path
        d="M14 3L25 23H19.4L14 13L8.6 23H3L14 3Z"
        fill={`url(#${id})`}
      />
      <path
        d="M14 15.5L17.6 22H10.4L14 15.5Z"
        fill="#6D5EF5"
      />
    </svg>
  );
}

interface LogoProps {
  markSize?: number;
  textSize?: string;
  showText?: boolean;
  href?: string;
  className?: string;
}

export function Logo({
  markSize = 26,
  textSize = "text-[17px]",
  showText = true,
  href = "/",
  className = "",
}: LogoProps) {
  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={markSize} />
      {showText && (
        <span className={`font-semibold tracking-tight text-white ${textSize}`}>
          SignalRecall
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus-visible:outline-electric">
        {content}
      </Link>
    );
  }

  return content;
}
