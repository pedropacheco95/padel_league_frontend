import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TournamentProvider } from "@/context/TournamentContext";
import { AuthProvider } from "./context/AuthContext";
import Index from "./pages/Shuffle/ShufflePage";
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import VerifyCode from "./pages/auth/VerifyCode";
import NotFound from "./pages/NotFound";
import Layout from "./components/layout/Layout";
import TournamentsPage from "./pages/tournaments/TournamentsPage";
import TournamentPage from "./pages/tournaments/TournamentPage";
import PlayersPage from "./pages/players/PlayersPage";
import PlayerPage from "./pages/players/PlayerPage";
import EditPlayerPage from "./pages/players/EditPlayerPage";
import ForEditPage from "./pages/matches/ForEditPage";
import ShufflePage from "./pages/Shuffle/ShufflePage";
import CreateShufflePage from "./pages/Shuffle/CreateShufflePage";
import CalendarPage from "./pages/CalendarPage";
import ChatbotPage from "./pages/ChatbotPage";
import TeamsPage from "./pages/teams/TeamsPage";
import CreateDivisionsPage from "./pages/editions/CreateDivisionsPage";
import NextMatchweekMessagePage from "./pages/editions/NextMatchweekMessagePage";
import GlobalApiLoader from "./components/GlobalApiLoader";
// S3 v2 public pages (VITE_V2_PUBLIC switches the old URLs over)
import { v2Or, v2FormatOr, v2PublicElements as v2, v2PublicRoutes } from "./features/publicRoutes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <TournamentProvider>
          <GlobalApiLoader />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout>{v2Or(<Home />, v2.home)}</Layout>} />
              <Route path="/login" element={<Layout><Login /></Layout>} />
              <Route path="/register" element={<Layout><Register /></Layout>} />
              <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />
              <Route path="/verify-code/:user_id" element={<Layout><VerifyCode /></Layout>} />
              <Route path="/tournaments" element={<Layout>{v2Or(<TournamentsPage />, v2.tournaments)}</Layout>} />
              <Route path="/tournaments/:id" element={<Layout>{v2Or(<TournamentPage />, v2.tournament)}</Layout>} />
              <Route path="/players" element={<Layout>{v2Or(<PlayersPage />, v2.players)}</Layout>} />
              <Route path="/players/edit/:id" element={<Layout><EditPlayerPage /></Layout>} />
              <Route path="/players/:id" element={<Layout>{v2Or(<PlayerPage />, v2.player)}</Layout>} />
              <Route path="/matches/for_edit" element={<Layout><ForEditPage /></Layout>} />
              <Route path="/calendar" element={<Layout>{v2Or(<CalendarPage />, v2.calendar)}</Layout>} />
              <Route path="/chatbot" element={<Layout><ChatbotPage /></Layout>} />
              <Route path="/teams" element={<Layout>{v2FormatOr(<TeamsPage />, v2.teams)}</Layout>} />
              <Route path="/shuffle" element={<Layout>{v2FormatOr(<ShufflePage />, v2.shuffle)}</Layout>} />
              <Route path="/shuffle/create" element={<Layout><CreateShufflePage /></Layout>} />
              <Route path="/edition/create_divisions" element={<Layout><CreateDivisionsPage /></Layout>} />
              <Route path="/edition/matchweek_message" element={<Layout><NextMatchweekMessagePage /></Layout>} />
              {/* S3: new v2 public routes */}
              {v2PublicRoutes}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TournamentProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
