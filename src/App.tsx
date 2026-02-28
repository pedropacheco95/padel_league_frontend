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
import NotFound from "./pages/NotFound";
import Layout from "./components/layout/Layout";
import TournamentsPage from "./pages/tournaments/TournamentsPage";
import TournamentPage from "./pages/tournaments/TournamentPage";
import PlayersPage from "./pages/players/PlayersPage";
import PlayerPage from "./pages/players/PlayerPage";
import ForEditPage from "./pages/matches/ForEditPage";
import ShufflePage from "./pages/Shuffle/ShufflePage";
import CreateShufflePage from "./pages/Shuffle/CreateShufflePage";
import CalendarPage from "./pages/CalendarPage";
import CreateDivisionsPage from "./pages/editions/CreateDivisionsPage";

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
              <Route path="/matches/for_edit" element={<Layout><ForEditPage /></Layout>} />
              <Route path="/calendar" element={<Layout><CalendarPage /></Layout>} />
              <Route path="/shuffle" element={<Layout><ShufflePage /></Layout>} />
              <Route path="/shuffle/create" element={<Layout><CreateShufflePage /></Layout>} />
              <Route path="/edition/create_divisions" element={<Layout><CreateDivisionsPage /></Layout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TournamentProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
