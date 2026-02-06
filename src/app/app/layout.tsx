import Navbar from "@/components/Navbar";
import ChatWidget from "@/components/ChatWidget";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Navbar />
      <main className="flex-1 min-w-0">{children}</main>
      <ChatWidget />
      <div id="vytara-translate" className="vytara-translate-anchor" />
    </div>
  );
}
