import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Transactions from "./pages/Transactions";
import Senders from "./pages/Senders";
import Payers from "./pages/Payers";
import Receivers from "./pages/Receivers";
import Settlements from "./pages/Settlements";
import Lending from "./pages/Lending";
import Wallets from "./pages/Wallets";
import Statements from "./pages/Statements";
import Ledger from "./pages/Ledger";
import Rates from "./pages/Rates";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import Accounts from "./pages/Accounts";
import Events from "./pages/Events";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "@/components/AdminLayout";
import AdminOverview from "./pages/admin/Overview";
import AdminUsers from "./pages/admin/Users";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import AdminTransactions from "./pages/admin/Transactions";
import AdminParties from "./pages/admin/Parties";
import AdminMaintenance from "./pages/admin/Maintenance";
import AdminSettings from "./pages/admin/Settings";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 rounded-sm bg-primary mx-auto flex items-center justify-center animate-pulse">
            <span className="text-primary-foreground font-bold text-sm font-mono">S</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;

  return (
    <Routes>
      <Route path="/admin/*" element={
        <AdminLayout>
          <Routes>
            <Route path="/" element={<AdminOverview />} />
            <Route path="/users" element={<AdminUsers />} />
            <Route path="/transactions" element={<AdminTransactions />} />
            <Route path="/parties" element={<AdminParties />} />
            <Route path="/audit" element={<AdminAuditLogs />} />
            <Route path="/maintenance" element={<AdminMaintenance />} />
            <Route path="/settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </AdminLayout>
      } />
      <Route path="/*" element={
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/senders" element={<Senders />} />
            <Route path="/payers" element={<Payers />} />
            <Route path="/receivers" element={<Receivers />} />
            <Route path="/settlements" element={<Settlements />} />
            <Route path="/lending" element={<Lending />} />
            <Route path="/wallets" element={<Wallets />} />
            <Route path="/statements" element={<Statements />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/rates" element={<Rates />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/events" element={<Events />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      } />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
