import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TournamentProvider } from "@/context/TournamentContext";
import { AuthProvider } from "./context/AuthContext";
import Index from "./pages/ShufflePage";
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import NotFound from "./pages/NotFound";
import Layout from "./components/layout/Layout";
import TournamentsPage from "./pages/tournaments/TournamentsPage";
import TournamentPage from "./pages/tournaments/TournamentPage";
import PlayersPage from "./pages/players/PlayersPage";
import PlayerPage from "./pages/players/PlayerPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <TournamentProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout><Home /></Layout>} />
              <Route path="/login" element={<Layout><Login /></Layout>} />
              <Route path="/tournaments" element={<Layout><TournamentsPage /></Layout>} />
              <Route path="/tournaments/:id" element={<Layout><TournamentPage /></Layout>} />
              <Route path="/players" element={<Layout><PlayersPage /></Layout>} />
              <Route path="/players/:id" element={<Layout><PlayerPage /></Layout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TournamentProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
