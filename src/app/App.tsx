import { Route, Routes } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout.tsx';
import { OverviewPage } from '../pages/OverviewPage.tsx';
import { AgentsPage } from '../pages/AgentsPage.tsx';
import { AgentDetailPage } from '../pages/AgentDetailPage.tsx';
import { FindingsPage } from '../pages/FindingsPage.tsx';
import { SourcesPage } from '../pages/SourcesPage.tsx';
import { RulesPage } from '../pages/RulesPage.tsx';
import { NotFoundPage } from '../pages/NotFoundPage.tsx';

export function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agents/:agentId" element={<AgentDetailPage />} />
        <Route path="findings" element={<FindingsPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
