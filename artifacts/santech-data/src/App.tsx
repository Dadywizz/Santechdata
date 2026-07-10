import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";

import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import VerifyEmail from "@/pages/verify-email";

import Dashboard from "@/pages/dashboard";
import BuyData from "@/pages/buy-data";
import BuyElectricity from "@/pages/buy-electricity";
import BuyCable from "@/pages/buy-cable";
import BuyExam from "@/pages/buy-exam";
import FundWallet from "@/pages/fund-wallet";
import Transactions from "@/pages/transactions";
import Referrals from "@/pages/referrals";
import Notifications from "@/pages/notifications";
import Support from "@/pages/support";
import Profile from "@/pages/profile";
import PaymentCallback from "@/pages/payment-callback";

import AdminDashboard from "@/pages/admin/index";
import AdminUsers from "@/pages/admin/users";
import AdminTransactions from "@/pages/admin/transactions";
import AdminDataPlans from "@/pages/admin/data-plans";
import AdminExams from "@/pages/admin/exams";
import AdminTickets from "@/pages/admin/tickets";
import AdminAnalytics from "@/pages/admin/analytics";
import AdminNotifications from "@/pages/admin/notifications";
import AdminSettings from "@/pages/admin/settings";
import AdminFailedPayments from "@/pages/admin/failed-payments";
import AdminResellers from "@/pages/admin/resellers";
import AdminApiKeys from "@/pages/admin/api-keys";
import ApiKeys from "@/pages/api-keys";
import BecomeReseller from "@/pages/become-reseller";
import BuyAirtime from "@/pages/buy-airtime";
import PrivacyPolicy from "@/pages/privacy-policy";
import AirtimeToCash from "@/pages/airtime-to-cash";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />

      <Route path="/" component={Landing} />

      <Route path="/dashboard" component={Dashboard} />
      <Route path="/buy-data" component={BuyData} />
      <Route path="/buy-airtime" component={BuyAirtime} />
      <Route path="/buy-electricity" component={BuyElectricity} />
      <Route path="/buy-cable" component={BuyCable} />
      <Route path="/buy-exam" component={BuyExam} />
      <Route path="/fund-wallet" component={FundWallet} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/referrals" component={Referrals} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/support" component={Support} />
      <Route path="/profile" component={Profile} />
      <Route path="/payment/callback" component={PaymentCallback} />
      <Route path="/airtime-to-cash" component={AirtimeToCash} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/api-keys" component={ApiKeys} />
      <Route path="/become-reseller" component={BecomeReseller} />

      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/transactions" component={AdminTransactions} />
      <Route path="/admin/data-plans" component={AdminDataPlans} />
      <Route path="/admin/exams" component={AdminExams} />
      <Route path="/admin/tickets" component={AdminTickets} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/notifications" component={AdminNotifications} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/failed-payments" component={AdminFailedPayments} />
      <Route path="/admin/resellers" component={AdminResellers} />
      <Route path="/admin/api-keys" component={AdminApiKeys} />

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
