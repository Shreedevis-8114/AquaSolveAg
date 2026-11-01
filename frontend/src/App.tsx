import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WaterProvider } from './contexts/WaterContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { ChemistryPage } from './pages/ChemistryPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { WhatIfPage } from './pages/WhatIfPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { ReportsPage } from './pages/ReportsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AboutPage } from './pages/AboutPage';
import { ResearchLabPage } from './pages/ResearchLabPage';

export const App: React.FC = () => {
  return (
    <Router>
      <WaterProvider>
        <div className="min-h-screen flex flex-col bg-[#060d17] text-slate-100 font-sans selection:bg-cyan-500 selection:text-navy-950">
          <Navbar />

          <div className="flex-1 flex w-full">
            <Sidebar />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
                <Route path="/chemistry" element={<ChemistryPage />} />
                <Route path="/recommendations" element={<RecommendationsPage />} />
                <Route path="/simulator" element={<SimulatorPage />} />
                <Route path="/research-lab" element={<ResearchLabPage />} />
                <Route path="/what-if" element={<WhatIfPage />} />
                <Route path="/comparison" element={<ComparisonPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>

          <Footer />
        </div>
      </WaterProvider>
    </Router>
  );
};

export default App;
