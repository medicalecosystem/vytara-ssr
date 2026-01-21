import Navbar from "@/components/Navbar";
import ChatWidget from "@/components/ChatWidget";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      {children}
      <ChatWidget />
    </>
  );
}
