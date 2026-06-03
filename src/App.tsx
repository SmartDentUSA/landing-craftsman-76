import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Suspense, lazy } from "react";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthLaunch from "./pages/AuthLaunch";
import OAuthCallback from "./pages/OAuthCallback";
import OAuthLaunch from "./pages/OAuthLaunch";
import PasswordReset from "./pages/PasswordReset";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy-load heavy pages so the initial bundle stays small.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Editor = lazy(() => import("./pages/Editor"));
const CodeView = lazy(() => import("./pages/CodeView"));
const CloudflareSettings = lazy(() => import("./pages/CloudflareSettings"));
const PublicationSettings = lazy(() => import("./pages/PublicationSettings"));
const Repository = lazy(() => import("./pages/Repository"));
const YouTubeOAuthSettings = lazy(() => import("./pages/YouTubeOAuthSettings"));
const GoogleBusinessOAuthSettings = lazy(() => import("./pages/GoogleBusinessOAuthSettings"));
const BlogImageTest = lazy(() => import("./pages/BlogImageTest"));
const LPClone = lazy(() => import("./pages/LPClone"));
const RAGMetricsDashboard = lazy(() => import("./pages/RAGMetricsDashboard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      <div className="text-sm text-muted-foreground">Carregando…</div>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              {/* Redirect /editor without ID to dashboard */}
              <Route path="/editor" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/editor/:id" element={<ProtectedRoute requiredRole="admin"><Editor /></ProtectedRoute>} />
              <Route path="/code-view" element={<ProtectedRoute><CodeView /></ProtectedRoute>} />
              <Route path="/cloudflare-settings" element={<ProtectedRoute><CloudflareSettings /></ProtectedRoute>} />
              <Route path="/publication-settings" element={<ProtectedRoute><PublicationSettings /></ProtectedRoute>} />
              <Route path="/repository" element={<ProtectedRoute requiredRole="admin"><Repository /></ProtectedRoute>} />
              <Route path="/google-business-settings" element={<ProtectedRoute><GoogleBusinessOAuthSettings /></ProtectedRoute>} />
              <Route path="/youtube-settings" element={<ProtectedRoute><YouTubeOAuthSettings /></ProtectedRoute>} />
              <Route path="/oauth2/callback" element={<OAuthCallback />} />
              <Route path="/oauth/launch" element={<OAuthLaunch />} />
              <Route path="/auth/launch" element={<AuthLaunch />} />
              <Route path="/password-reset" element={<PasswordReset />} />
              <Route path="/blog-image-test" element={<ProtectedRoute><BlogImageTest /></ProtectedRoute>} />
              <Route path="/lp-clone" element={<ProtectedRoute requiredRole="admin"><LPClone /></ProtectedRoute>} />
              <Route path="/admin/metrics/rag" element={<ProtectedRoute requiredRole="admin"><RAGMetricsDashboard /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
