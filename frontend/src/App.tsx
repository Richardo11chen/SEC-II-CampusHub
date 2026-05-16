import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ProfilePage from '@/pages/ProfilePage';
import CreateDemandPage from '@/pages/CreateDemandPage';
import DemandDetailPage from '@/pages/DemandDetailPage';
import UserPublicPage from '@/pages/UserPublicPage';
import OrderListPage from '@/pages/OrderListPage';
import OrderDetailPage from '@/pages/OrderDetailPage';
import NotificationsPage from '@/pages/NotificationsPage';

import AdminPage from '@/pages/AdminPage';

export default function App() {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* 使用 Layout 的路由 */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/demands/:id" element={<DemandDetailPage />} />
        <Route path="/users/:id" element={<UserPublicPage />} />

        {/* 需登录 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/demands/new" element={<CreateDemandPage />} />
          <Route path="/demands/:id/edit" element={<CreateDemandPage />} />
          <Route path="/users/me" element={<ProfilePage />} />
          <Route path="/orders" element={<OrderListPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
