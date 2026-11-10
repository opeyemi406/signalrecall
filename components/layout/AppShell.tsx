"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AIPanel } from "./AIPanel";
import { Dialog, SheetContent, DialogTitle } from "@/components/ui/dialog";

export const SearchContext = React.createContext<{
  query: string;
  setQuery: (q: string) => void;
}>({ query: "", setQuery: () => {} });

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [query, setQuery] = React.useState("");
  const [mobileAIOpen, setMobileAIOpen] = React.useState(false);

  // When visiting the landing page root ("/"), render the immersive, full-bleed experience
  if (pathname === "/") {
    return (
      <div className="min-h-screen w-full bg-[#060913] text-white selection:bg-electric selection:text-white overflow-x-hidden">
        {children}
      </div>
    );
  }

  return (
    <SearchContext.Provider value={{ query, setQuery }}>
      <div className="app-bg grain flex h-screen w-screen overflow-hidden text-fg">
        {/* Column 1: Left Sidebar */}
        <Sidebar />

        {/* Column 2: Topbar + Main Scrollable Viewport */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar
            searchQuery={query}
            onSearchChange={setQuery}
            onOpenMobileAI={() => setMobileAIOpen(true)}
          />
          <main className="scroll-panel flex-1 overflow-y-auto px-3.5 sm:px-6 pb-8 pt-2 min-w-0">
            {children}
          </main>
        </div>

        {/* Column 3: Persistent Right AI Assistant Panel (>=1280px) */}
        <div className="hidden xl:block w-[356px] shrink-0 p-4 pl-0">
          <AIPanel />
        </div>

        {/* Slide-over AI Drawer for <1280px */}
        <Dialog open={mobileAIOpen} onOpenChange={setMobileAIOpen}>
          <SheetContent>
            <DialogTitle className="sr-only">SignalRecall AI Assistant</DialogTitle>
            <AIPanel onClose={() => setMobileAIOpen(false)} />
          </SheetContent>
        </Dialog>
      </div>
    </SearchContext.Provider>
  );
}
