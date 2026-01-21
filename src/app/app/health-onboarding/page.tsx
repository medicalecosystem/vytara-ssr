import HealthOnboardingChatbot from "@/components/HealthOnboardingChatbot";

export default function HealthOnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 text-slate-900">
      <main className="max-w-6xl mx-auto px-6 py-12">
        <HealthOnboardingChatbot />
      </main>
    </div>
  );
}
