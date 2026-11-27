import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import PatientDashboardPage from './pages/patient/DashboardPage';
import PatientProfilePage from './pages/patient/ProfilePage';
import ReportsPage from './pages/patient/ReportsPage';
import ChatPage from './pages/patient/ChatPage';
import CarePage from './pages/patient/CarePage';
import CommunityPage from './pages/patient/CommunityPage';
import QrSharePage from './pages/patient/QrSharePage';

import DoctorDashboardPage from './pages/doctor/DashboardPage';
import DoctorPatientsPage from './pages/doctor/PatientsPage';
import PatientDetailPage from './pages/doctor/PatientDetailPage';
import DoctorProfilePage from './pages/doctor/ProfilePage';
import MentorPage from './pages/doctor/MentorPage';
import ReferencesPage from './pages/doctor/ReferencesPage';
import SurgicalTipsPage from './pages/doctor/SurgicalTipsPage';
import ForumPage from './pages/doctor/ForumPage';

function HomeRedirect() {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="spinner" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Navigate
      to={user.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard'}
      replace
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Patient Routes */}
      <Route
        path="/patient/dashboard"
        element={
          <ProtectedRoute allowedRole="patient">
            <PatientDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/profile"
        element={
          <ProtectedRoute allowedRole="patient">
            <PatientProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/reports"
        element={
          <ProtectedRoute allowedRole="patient">
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/chat"
        element={
          <ProtectedRoute allowedRole="patient">
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/community"
        element={
          <ProtectedRoute allowedRole="patient">
            <CommunityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/care"
        element={
          <ProtectedRoute allowedRole="patient">
            <CarePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/qr"
        element={
          <ProtectedRoute allowedRole="patient">
            <QrSharePage />
          </ProtectedRoute>
        }
      />

      {/* Doctor Routes */}
      <Route
        path="/doctor/dashboard"
        element={
          <ProtectedRoute allowedRole="doctor">
            <DoctorDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/patients"
        element={
          <ProtectedRoute allowedRole="doctor">
            <DoctorPatientsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/patients/:id"
        element={
          <ProtectedRoute allowedRole="doctor">
            <PatientDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/mentor"
        element={
          <ProtectedRoute allowedRole="doctor">
            <MentorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/references"
        element={
          <ProtectedRoute allowedRole="doctor">
            <ReferencesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/surgical-tips"
        element={
          <ProtectedRoute allowedRole="doctor">
            <SurgicalTipsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/forum"
        element={
          <ProtectedRoute allowedRole="doctor">
            <ForumPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/profile"
        element={
          <ProtectedRoute allowedRole="doctor">
            <DoctorProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/chat"
        element={
          <ProtectedRoute allowedRole="doctor">
            <ChatPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
