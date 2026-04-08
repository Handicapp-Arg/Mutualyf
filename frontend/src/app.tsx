import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages';
import { AdminPortal } from '@/pages/admin-portal';

/**
 * App Component - Root de la aplicación
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPortal />} />
      </Routes>
    </BrowserRouter>
  );
}
