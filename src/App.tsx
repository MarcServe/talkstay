import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Landing from "@/talkstay/pages/Landing";

// Lazy-loaded surfaces (built out across phases)
const GuestApp = lazy(() => import("@/talkstay/pages/GuestApp"));
const HotelApp = lazy(() => import("@/talkstay/pages/HotelApp"));
const DemoApp = lazy(() => import("@/talkstay/pages/DemoApp"));
const LiveView = lazy(() => import("@/talkstay/pages/LiveView"));
const TalkStayAdminApp = lazy(() => import("@/talkstay/admin/TalkStayAdminApp"));
const NotFound = lazy(() => import("@/talkstay/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dashboard data: prefer cached paint, refresh quietly in the background.
      staleTime: 15_000,
      gcTime: 15 * 60_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center text-muted-foreground">
    Loading…
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Marketing */}
              <Route path="/" element={<Landing />} />

              {/* Guest PWA — scanned from a room QR code */}
              <Route path="/h/:hotelSlug/r/:roomId" element={<GuestApp />} />

              {/* Hotel staff + admin (auth-gated inside) */}
              <Route path="/app/*" element={<HotelApp />} />

              {/* Marketing sandbox — no auth, no Supabase writes */}
              <Route path="/demo" element={<DemoApp />} />
              <Route path="/demo/*" element={<DemoApp />} />

              {/* Read-only live ops share — token-gated, no signup */}
              <Route path="/live/:token" element={<LiveView />} />

              {/* Platform admin — requires public.is_admin(user) */}
              <Route path="/admin/*" element={<TalkStayAdminApp />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
