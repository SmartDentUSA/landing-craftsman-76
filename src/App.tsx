import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CategoryProvider } from "@/contexts/CategoryContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import CodeView from "./pages/CodeView";
import CloudflareSettings from "./pages/CloudflareSettings";
import PublicationSettings from "./pages/PublicationSettings";
import BlogEditor from "./pages/BlogEditor";
import Repository from "./pages/Repository";
import YouTubeOAuthSettings from "./pages/YouTubeOAuthSettings";
import GoogleBusinessOAuthSettings from "./pages/GoogleBusinessOAuthSettings";
import OAuthCallback from "./pages/OAuthCallback";
import OAuthLaunch from "./pages/OAuthLaunch";
import AuthLaunch from "./pages/AuthLaunch";
import Auth from "./pages/Auth";
import PasswordReset from "./pages/PasswordReset";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import BlogImageTest from "./pages/BlogImageTest";
import LPClone from "./pages/LPClone";
import RAGMetricsDashboard from "./pages/RAGMetricsDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <CategoryProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          {/* Redirect /editor without ID to dashboard */}
          <Route path="/editor" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/editor/:id" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
          <Route path="/code-view" element={<ProtectedRoute><CodeView /></ProtectedRoute>} />
          <Route path="/cloudflare-settings" element={<ProtectedRoute><CloudflareSettings /></ProtectedRoute>} />
          <Route path="/publication-settings" element={<ProtectedRoute><PublicationSettings /></ProtectedRoute>} />
          <Route path="/repository" element={<ProtectedRoute><Repository /></ProtectedRoute>} />
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
        </BrowserRouter>
      </TooltipProvider>
    </CategoryProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
