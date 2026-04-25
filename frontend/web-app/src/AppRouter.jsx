import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const PatientDashboard = React.lazy(() => import('./pages/PatientDashboard'));
const PatientDiscover = React.lazy(() => import('./pages/PatientDiscover'));
const PatientDoctorDirectory = React.lazy(() => import('./pages/PatientDoctorDirectory'));
const ClinicDirectory = React.lazy(() => import('./pages/ClinicDirectory'));
const ClinicDetail = React.lazy(() => import('./pages/ClinicDetail'));
const DoctorDetail = React.lazy(() => import('./pages/DoctorDetail'));
const SpecialtyDetail = React.lazy(() => import('./pages/SpecialtyDetail'));
const DoctorDashboard = React.lazy(() => import('./pages/DoctorDashboard'));
const DoctorAppointments = React.lazy(() => import('./pages/DoctorAppointments'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const DoctorManagement = React.lazy(() => import('./pages/DoctorManagement'));
const BookingManagement = React.lazy(() => import('./pages/BookingManagement'));
const AdminRevenueReports = React.lazy(() => import('./pages/AdminRevenueReports'));
const ClinicManagement = React.lazy(() => import('./pages/ClinicManagement'));
const SpecialtyManagement = React.lazy(() => import('./pages/SpecialtyManagement'));
const PatientAiTriage = React.lazy(() => import('./pages/PatientAiTriage'));
const PatientPaymentStatus = React.lazy(() => import('./pages/PatientPaymentStatus'));

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
            <React.Suspense fallback={null}>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Patient Routes */}
                    <Route path="/patient" element={<ProtectedRoute allowedRoles={['R3']} />}>
                        <Route index element={<PatientDashboard />} />
                        <Route path="discover" element={<PatientDiscover />} />
                        <Route path="doctors" element={<PatientDoctorDirectory />} />
                        <Route path="ai" element={<PatientAiTriage />} />
                        <Route path="bookings/:bookingId/payment" element={<PatientPaymentStatus />} />
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
                        <Route path="doctors" element={<DoctorManagement />} />
                        <Route path="bookings" element={<BookingManagement />} />
                        <Route path="revenue" element={<AdminRevenueReports />} />
                        <Route path="clinics" element={<ClinicManagement />} />
                        <Route path="specialties" element={<SpecialtyManagement />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </React.Suspense>
        </Router>
    );
};

export default AppRouter;
