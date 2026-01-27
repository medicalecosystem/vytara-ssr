import { Suspense } from "react";
import SetPasswordClient from "./SetPasswordClient";

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-gray-400">
          Verifying link…
        </div>
      }
    >
      <SetPasswordClient />
    </Suspense>
  );
}