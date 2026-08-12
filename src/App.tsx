import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Landing from "@/talkstay/pages/Landing";

// Lazy-loaded surfaces (built out across phases)
const GuestApp = lazy(() => import("@/talkstay/pages/GuestApp"));
const GuestCheckIn = lazy(() => import("@/talkstay/pages/GuestCheckIn"));
const GuestCheckOut = lazy(() => import("@/talkstay/pages/GuestCheckOut"));
const HotelApp = lazy(() => import("@/talkstay/pages/HotelApp"));
const DemoHub = lazy(() => import("@/talkstay/pages/DemoHub"));
const DemoApp = lazy(() => import("@/talkstay/pages/DemoApp"));
const DemoGuestApp = lazy(() => import("@/talkstay/pages/DemoGuestApp"));
const DemoGuestCheckIn = lazy(() => import("@/talkstay/pages/DemoGuestCheckIn"));
const DemoGuestCheckOut = lazy(() => import("@/talkstay/pages/DemoGuestCheckOut"));
const LiveView = lazy(() => import("@/talkstay/pages/LiveView"));
const TalkStayAdminApp = lazy(() => import("@/talkstay/admin/TalkStayAdminApp"));
const NotFound = lazy(() => import("@/talkstay/pages/NotFound"));
const PrivacyPolicyPage = lazy(() => import("@/talkstay/pages/legal/PrivacyPolicyPage"));
const TermsOfUsePage = lazy(() => import("@/talkstay/pages/legal/TermsOfUsePage"));
const CookiePolicyPage = lazy(() => import("@/talkstay/pages/legal/CookiePolicyPage"));
const AcceptableUsePage = lazy(() => import("@/talkstay/pages/legal/AcceptableUsePage"));
const DataProcessingPage = lazy(() => import("@/talkstay/pages/legal/DataProcessingPage"));

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

              {/* Legal — production-ready public policies */}
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
              <Route path="/terms" element={<TermsOfUsePage />} />
              <Route path="/terms-of-use" element={<Navigate to="/terms" replace />} />
              <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
              <Route path="/cookies" element={<CookiePolicyPage />} />
              <Route path="/cookie-policy" element={<Navigate to="/cookies" replace />} />
              <Route path="/acceptable-use" element={<AcceptableUsePage />} />
              <Route path="/data-processing" element={<DataProcessingPage />} />

              {/* Guest PWA — scanned from a room QR code */}
              <Route path="/h/:hotelSlug/r/:roomId" element={<GuestApp />} />
              <Route path="/h/:hotelSlug/r/:roomId/checkin" element={<GuestCheckIn />} />
              <Route path="/h/:hotelSlug/r/:roomId/checkout" element={<GuestCheckOut />} />

              {/* Hotel staff + admin (auth-gated inside) */}
              <Route path="/app/*" element={<HotelApp />} />

              {/* Marketing demos — hub + guest + staff operations */}
              <Route path="/demo" element={<DemoHub />} />
              <Route path="/demo/guest" element={<DemoGuestApp />} />
              <Route path="/demo/guest/checkin" element={<DemoGuestCheckIn />} />
              <Route path="/demo/guest/checkout" element={<DemoGuestCheckOut />} />
              <Route path="/demo/operations" element={<DemoApp />} />
              {/* Back-compat aliases from older campaign links */}
              <Route path="/demo/*" element={<DemoHub />} />

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
