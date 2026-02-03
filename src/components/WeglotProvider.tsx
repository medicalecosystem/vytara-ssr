"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

const refreshWeglot = () => {
  // Weglot can be slightly behind route renders, so we refresh a few times.
  const delays = [0, 150, 600];
  delays.forEach((delay) => {
    window.setTimeout(() => {
      // @ts-expect-error - Weglot is injected by the script
      const weglot = window.Weglot;
      weglot?.refresh?.();
    }, delay);
  });
};

function WeglotSync({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Re-apply translations after every client-side route change.
  useEffect(() => {
    if (!enabled) return;
    // Let the new route paint before asking Weglot to translate.
    const id = window.setTimeout(() => refreshWeglot(), 0);
    return () => window.clearTimeout(id);
  }, [enabled, pathname, searchParams]);

  // Ensure language changes apply instantly without a full refresh.
  useEffect(() => {
    if (!enabled) return;
    // @ts-expect-error - Weglot is injected by the script
    const weglot = window.Weglot;
    if (!weglot?.on) return;

    const handler = () => refreshWeglot();
    weglot.on("languageChanged", handler);

    return () => {
      try {
        weglot.off?.("languageChanged", handler);
      } catch {
        // No-op: some Weglot builds may not expose "off".
      }
    };
  }, [enabled]);

  return null;
}

export default function WeglotProvider() {
  const [isReady, setIsReady] = useState(false);

  return (
    <>
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
          setIsReady(true);
          // Apply translations immediately after initialization.
          window.setTimeout(() => refreshWeglot(), 0);
        }}
      />
      <Suspense fallback={null}>
        <WeglotSync enabled={isReady} />
      </Suspense>
    </>
  );
}
