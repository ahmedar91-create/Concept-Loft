import { Navigate, Route, Routes } from 'react-router-dom';
import { UIProvider } from './components/ui';
import { FinanceLayout } from './components/FinanceLayout';
import { OperationsLayout } from './components/OperationsLayout';
import { Dashboard } from './modules/finance/Dashboard';
import { Catalogue } from './modules/finance/Catalogue';
import { Clients } from './modules/finance/Clients';
import { Documents } from './modules/finance/Documents';
import { DocumentEditor } from './modules/finance/DocumentEditor';
import { Settings } from './modules/finance/Settings';
import { Commandes } from './modules/operations/Commandes';
import { CommandeForm } from './modules/operations/CommandeForm';
import { CommandeDetail } from './modules/operations/CommandeDetail';

export default function App() {
  return (
    <UIProvider>
      <Routes>
        {/* ───────── Module financier ───────── */}
        <Route element={<FinanceLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="catalogue" element={<Catalogue />} />
          <Route path="clients" element={<Clients />} />
          <Route path="documents" element={<Documents />} />
          <Route path="documents/nouveau/:type" element={<DocumentEditor />} />
          <Route path="documents/:id" element={<DocumentEditor />} />
          <Route path="parametres" element={<Settings />} />
        </Route>

        {/* ───────── Module opérationnel (mobile) ───────── */}
        <Route path="atelier" element={<OperationsLayout />}>
          <Route index element={<Commandes />} />
          <Route path="nouvelle" element={<CommandeForm />} />
          <Route path=":id" element={<CommandeDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UIProvider>
  );
}
