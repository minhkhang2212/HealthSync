import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PatientDashboard from './pages/PatientDashboard';
import ClinicDirectory from './pages/ClinicDirectory';
import ClinicDetail from './pages/ClinicDetail';
import DoctorDetail from './pages/DoctorDetail';
import SpecialtyDetail from './pages/SpecialtyDetail';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorAppointments from './pages/DoctorAppointments';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ClinicManagement from './pages/ClinicManagement';
import SpecialtyManagement from './pages/SpecialtyManagement';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user } = useSelector(state => state.auth);

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (isAuthenticated && !user) {
        return <div className="min-h-screen grid place-items-center">Loading profile...</div>;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.roleId)) {
        return <Navigate to="/" replace />;
    }

    return children ?? <Outlet />;
};

const RootRedirect = () => {
    const { isAuthenticated, user } = useSelector(state => state.auth);
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!user) return <div className="min-h-screen grid place-items-center">Loading profile...</div>;

    // Redirect based on role if already logged in
    if (user?.roleId === 'R1') return <Navigate to="/admin/dashboard" replace />;
    if (user?.roleId === 'R2') return <Navigate to="/doctor/dashboard" replace />;
    return <Navigate to="/patient" replace />;
};

const AppRouter = () => {
    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Patient Routes */}
                <Route path="/patient" element={<ProtectedRoute allowedRoles={['R3']} />}>
                    <Route index element={<PatientDashboard />} />
                    <Route path="clinics" element={<ClinicDirectory />} />
                    <Route path="clinics/:id" element={<ClinicDetail />} />
                    <Route path="doctor/:id" element={<DoctorDetail />} />
                    <Route path="specialties/:id" element={<SpecialtyDetail />} />
                </Route>

                {/* Doctor Routes */}
                <Route path="/doctor" element={<ProtectedRoute allowedRoles={['R2']} />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<DoctorDashboard />} />
                    <Route path="appointments" element={<DoctorAppointments />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute allowedRoles={['R1']} />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="clinics" element={<ClinicManagement />} />
                    <Route path="specialties" element={<SpecialtyManagement />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
};

export default AppRouter;
