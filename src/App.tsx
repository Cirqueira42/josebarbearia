import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import Agendar from "./pages/Agendar";
import Avaliar from "./pages/Avaliar";
import BarberView from "./pages/BarberView";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import { useAppUpdater } from "./hooks/useAppUpdater";

const queryClient = new QueryClient();

const AppUpdater = () => {
  useAppUpdater();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppUpdater />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/agendar" element={<Agendar />} />
          <Route path="/avaliar" element={<Avaliar />} />
          <Route path="/admin" element={<ProtectedAdminRoute><Admin /></ProtectedAdminRoute>} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/barbeiro/:id" element={<BarberView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
