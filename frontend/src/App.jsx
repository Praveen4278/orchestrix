import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './store/AppContext';
import ModeSelector from './pages/ModeSelector';
import SearchPage from './pages/SearchPage';
import PipelinePage from './pages/PipelinePage';
import ResultsPage from './pages/ResultsPage';
import SessionHistory from './pages/SessionHistory';
import Layout from './components/Layout';

export default function App() {
  const { state } = useApp();

  if (!state.executionMode) {
    return <ModeSelector />;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/sessions" element={<SessionHistory />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
