import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import CodeView from "./pages/CodeView";
import CloudflareSettings from "./pages/CloudflareSettings";
import PublicationSettings from "./pages/PublicationSettings";
import BlogGenerator from "./pages/BlogGenerator";
import Auth from "./pages/Auth";
import PasswordReset from "./pages/PasswordReset";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/editor" element={<ProtectedRoute requiredRole="admin"><Editor /></ProtectedRoute>} />
          <Route path="/editor/:id" element={<ProtectedRoute requiredRole="admin"><Editor /></ProtectedRoute>} />
          <Route path="/code-view" element={<ProtectedRoute requiredRole="admin"><CodeView /></ProtectedRoute>} />
          <Route path="/cloudflare-settings" element={<ProtectedRoute requiredRole="admin"><CloudflareSettings /></ProtectedRoute>} />
          <Route path="/publication-settings" element={<ProtectedRoute requiredRole="admin"><PublicationSettings /></ProtectedRoute>} />
          <Route path="/blog-generator/:id" element={<ProtectedRoute requiredRole="admin"><BlogGenerator /></ProtectedRoute>} />
          <Route path="/password-reset" element={<PasswordReset />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
