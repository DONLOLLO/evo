import type { ReactNode } from "react";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import Aurora from "./Aurora";

export default function Layout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Aurora />
      <div className="relative z-10 flex flex-col min-h-screen">
        <TopBar title={title} />
        <main className="flex-1 pb-40 px-5 pt-4 max-w-2xl w-full mx-auto">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
