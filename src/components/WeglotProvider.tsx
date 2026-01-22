"use client";

import Script from "next/script";

export default function WeglotProvider() {
  return (
    <Script
      src="https://cdn.weglot.com/weglot.min.js"
      strategy="afterInteractive"
      onLoad={() => {
        // @ts-expect-error - Weglot is injected by the script
        window.Weglot?.initialize({
          api_key: process.env.NEXT_PUBLIC_WEGLOT_API_KEY!,
          // Optional but recommended:
          originalLanguage: "en",
          // destinationLanguages: "hi,gu,mr", // add later if you want
        });
      }}
    />
  );
}