import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';
import Register from './pages/Register.jsx';
import VerifyOtp from './pages/VerifyOtp.jsx';
import Login from './pages/Login.jsx';
import Browse from './pages/Browse.jsx';
import ListingDetail from './pages/ListingDetail.jsx';
import ListingForm from './pages/ListingForm.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Notifications from './pages/Notifications.jsx';
import Messages from './pages/Messages.jsx';
import Thread from './pages/Thread.jsx';
import PublicProfile from './pages/PublicProfile.jsx';
import Saved from './pages/Saved.jsx';
import Guidelines from './pages/Guidelines.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import AdminOverview from './pages/admin/AdminOverview.jsx';
import AdminModeration from './pages/admin/AdminModeration.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminListings from './pages/admin/AdminListings.jsx';
import AdminPayments from './pages/admin/AdminPayments.jsx';

export default function App() {
  return (
    <Routes>
      {/* Admin console — its own shell (AdminLayout), deliberately NOT inside the
          marketplace Layout/nav. It only ever shows admin functions. */}
      <Route path="admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminOverview />} />
        <Route path="moderation" element={<AdminModeration />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="listings" element={<AdminListings />} />
        <Route path="payments" element={<AdminPayments />} />
      </Route>
      <Route path="admin/reports" element={<Navigate to="/admin/moderation" replace />} />
      <Route path="admin/stats" element={<Navigate to="/admin" replace />} />

      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="register" element={<Register />} />
        <Route path="verify" element={<VerifyOtp />} />
        <Route path="login" element={<Login />} />
        <Route path="browse" element={<Browse />} />
        <Route path="guidelines" element={<Guidelines />} />
        <Route path="u/:id" element={<PublicProfile />} />
        <Route path="listings/new" element={<ProtectedRoute><ListingForm mode="create" /></ProtectedRoute>} />
        <Route path="listings/:id" element={<ListingDetail />} />
        <Route path="listings/:id/edit" element={<ProtectedRoute><ListingForm mode="edit" /></ProtectedRoute>} />
        <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="saved" element={<ProtectedRoute><Saved /></ProtectedRoute>} />
        <Route path="orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
        <Route path="messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="messages/:userId" element={<ProtectedRoute><Thread /></ProtectedRoute>} />
        <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
