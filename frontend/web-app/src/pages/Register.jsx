import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';
import { registerUser, googleAuth, clearError } from '../store/slices/authSlice';

const PASSWORD_STRENGTH_STYLES = [
    { label: 'Very weak', percent: 20, color: '#ef4444' },
    { label: 'Weak', percent: 40, color: '#f97316' },
    { label: 'Fair', percent: 60, color: '#f59e0b' },
    { label: 'Good', percent: 80, color: '#2563eb' },
    { label: 'Strong', percent: 100, color: '#10b981' },
];

const Register = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { loading, error } = useSelector((state) => state.auth);
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
    const [passwordStrengthAnalyzer, setPasswordStrengthAnalyzer] = useState(null);
    const [formError, setFormError] = useState('');
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        gender: '',
    });

    useEffect(() => {
        let isMounted = true;

        import('zxcvbn')
            .then((module) => {
                if (isMounted) {
                    setPasswordStrengthAnalyzer(() => module.default || module);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setPasswordStrengthAnalyzer(null);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const handleChange = (event) => {
        if (formError) {
            setFormError('');
        }

        if (error) {
            dispatch(clearError());
        }

        setFormData((previous) => ({
            ...previous,
            [event.target.name]: event.target.value,
        }));
    };

    const handleRegister = async (event) => {
        event.preventDefault();

        if (!formData.password_confirmation) {
            setFormError('Please confirm your password.');
            return;
        }

        if (formData.password !== formData.password_confirmation) {
            setFormError('Passwords do not match.');
            return;
        }

        const payload = {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            password: formData.password,
            password_confirmation: formData.password_confirmation,
            phoneNumber: formData.phone,
            gender: formData.gender,
        };

        const result = await dispatch(registerUser(payload));

        if (registerUser.fulfilled.match(result)) {
            navigate('/patient');
        }
    };

    const handleGoogleCredential = async (credential) => {
        const result = await dispatch(googleAuth(credential));

        if (googleAuth.fulfilled.match(result)) {
            const role = result.payload.user?.roleId;
            if (role === 'R1') navigate('/admin/dashboard');
            else if (role === 'R2') navigate('/doctor/dashboard');
            else navigate('/patient');
        }
    };

    const passwordStrength = useMemo(() => {
        if (!formData.password) {
            return {
                label: 'Enter password',
                percent: 0,
                color: '#cbd5e1',
            };
        }

        if (!passwordStrengthAnalyzer) {
            return {
                label: 'Checking...',
                percent: 25,
                color: '#94a3b8',
            };
        }

        const result = passwordStrengthAnalyzer(formData.password);

        return PASSWORD_STRENGTH_STYLES[result.score] || PASSWORD_STRENGTH_STYLES[0];
    }, [formData.password, passwordStrengthAnalyzer]);

    return (
        <div className="font-display bg-slate-100 text-slate-900 min-h-screen flex items-center justify-center p-4 lg:p-8">
            <div className="max-w-[1200px] w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                <div className="flex flex-col lg:flex-row">
                    <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-end p-12 overflow-hidden bg-slate-100 min-h-[760px]">
                        <div className="absolute inset-0 z-0">
                            <img
                                alt="Professional healthcare environment"
                                className="h-full w-full object-cover opacity-70"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6WY6oCynpmmMEMVqRLkiLhX-9fgIw5jKyZsx_e0fB_RF-ZTB8qVn6MXGyZYsm-YtE5Y69g8obtCB6R28Wqz3ljHY6WqQEJG-VWG1OrSMcxjB4EZM21cAft7oVmhKE8wiiaMfu47i0wp0UqAJvOLpAvGTRq3NNRea3JgSr9PXP1clg5Twg3MKBM7j9xIGr7huYumh7_ry3PdT-7fDfSCmsz1qbLiIoTItjIGgl_Zcn28OtVG3XQG0YVc9FMUZWgpN9Vzz24qCtff0b"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/45 to-white/20"></div>
                        </div>
                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex items-center gap-3 text-slate-900">
                                <span className="material-symbols-outlined text-4xl text-primary">health_and_safety</span>
                                <h1 className="text-3xl font-bold tracking-tight">HealthSync</h1>
                            </div>
                            <p className="text-slate-900 text-5xl font-black leading-tight tracking-tight max-w-md">
                                Healthcare, In Sync
                            </p>
                            <p className="text-slate-600 text-lg max-w-sm">
                                Access your medical records, schedule appointments, and connect with your care team in one secure place.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 lg:px-14 xl:px-16">
                        <div className="w-full max-w-md">
                            <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
                                <span className="material-symbols-outlined text-3xl text-primary">health_and_safety</span>
                                <h2 className="text-2xl font-bold">HealthSync</h2>
                            </div>

                            <div className="mb-8">
                                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Create Account</h2>
                                <p className="mt-2 text-slate-600">Join HealthSync to manage your wellness journey.</p>
                            </div>

                            {(formError || error) && (
                                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">error</span>
                                    {formError || error}
                                </div>
                            )}

                            <form className="space-y-5" onSubmit={handleRegister}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">First Name</label>
                                        <input
                                            className="w-full rounded-lg border border-slate-300 bg-slate-100 focus:border-primary focus:ring-primary px-3 py-2"
                                            name="firstName"
                                            onChange={handleChange}
                                            placeholder="John"
                                            type="text"
                                            value={formData.firstName}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Last Name</label>
                                        <input
                                            className="w-full rounded-lg border border-slate-300 bg-slate-100 focus:border-primary focus:ring-primary px-3 py-2"
                                            name="lastName"
                                            onChange={handleChange}
                                            placeholder="Doe"
                                            type="text"
                                            value={formData.lastName}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Email Address</label>
                                    <input
                                        className="w-full rounded-lg border border-slate-300 bg-slate-100 focus:border-primary focus:ring-primary px-3 py-2"
                                        name="email"
                                        onChange={handleChange}
                                        placeholder="name@example.com"
                                        type="email"
                                        value={formData.email}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                                    <input
                                        className="w-full rounded-lg border border-slate-300 bg-slate-100 focus:border-primary focus:ring-primary px-3 py-2"
                                        name="phone"
                                        onChange={handleChange}
                                        placeholder="+44 (555) 000-0000"
                                        type="tel"
                                        value={formData.phone}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Password</label>
                                    <div className="relative">
                                        <input
                                            className="w-full rounded-lg border border-slate-300 bg-slate-100 focus:border-primary focus:ring-primary pr-10 px-3 py-2"
                                            name="password"
                                            onChange={handleChange}
                                            placeholder="Create a password"
                                            type={passwordVisible ? 'text' : 'password'}
                                            value={formData.password}
                                        />
                                        <button
                                            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                            onClick={() => setPasswordVisible((previous) => !previous)}
                                            type="button"
                                        >
                                            <span className="material-symbols-outlined">
                                                {passwordVisible ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                    <div className="mt-2">
                                        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${passwordStrength.percent}%`,
                                                    backgroundColor: passwordStrength.color,
                                                }}
                                            ></div>
                                        </div>
                                        <p className="text-[10px] mt-1 text-slate-500 uppercase font-bold tracking-wider">
                                            Strength: {passwordStrength.label}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Confirm Password</label>
                                    <div className="relative">
                                        <input
                                            className="w-full rounded-lg border border-slate-300 bg-slate-100 focus:border-primary focus:ring-primary pr-10 px-3 py-2"
                                            name="password_confirmation"
                                            onChange={handleChange}
                                            placeholder="Confirm your password"
                                            type={confirmPasswordVisible ? 'text' : 'password'}
                                            value={formData.password_confirmation}
                                        />
                                        <button
                                            aria-label={confirmPasswordVisible ? 'Hide confirm password' : 'Show confirm password'}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                            onClick={() => setConfirmPasswordVisible((previous) => !previous)}
                                            type="button"
                                        >
                                            <span className="material-symbols-outlined">
                                                {confirmPasswordVisible ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-slate-700">Gender</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                className="text-primary focus:ring-primary border-slate-300 bg-white"
                                                name="gender"
                                                onChange={handleChange}
                                                type="radio"
                                                value="M"
                                            />
                                            <span className="text-sm text-slate-600 group-hover:text-primary transition-colors">Male</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                className="text-primary focus:ring-primary border-slate-300 bg-white"
                                                name="gender"
                                                onChange={handleChange}
                                                type="radio"
                                                value="F"
                                            />
                                            <span className="text-sm text-slate-600 group-hover:text-primary transition-colors">Female</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                className="text-primary focus:ring-primary border-slate-300 bg-white"
                                                name="gender"
                                                onChange={handleChange}
                                                type="radio"
                                                value="O"
                                            />
                                            <span className="text-sm text-slate-600 group-hover:text-primary transition-colors">Other</span>
                                        </label>
                                    </div>
                                </div>

                                <button
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2"
                                    disabled={loading}
                                    type="submit"
                                >
                                    {loading ? (
                                        <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                                    ) : (
                                        'Create Account'
                                    )}
                                </button>

                                {googleClientId && (
                                    <>
                                        <div className="relative flex items-center py-1">
                                            <div className="flex-grow border-t border-slate-200"></div>
                                            <span className="flex-shrink mx-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                                Or continue with
                                            </span>
                                            <div className="flex-grow border-t border-slate-200"></div>
                                        </div>

                                        <GoogleAuthButton
                                            clientId={googleClientId}
                                            disabled={loading}
                                            onCredential={handleGoogleCredential}
                                        />
                                    </>
                                )}
                            </form>

                            <div className="mt-8 text-center">
                                <p className="text-sm text-slate-600">
                                    Already have an account?
                                    <Link to="/login" className="font-bold text-primary hover:underline ml-1">Sign In</Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
