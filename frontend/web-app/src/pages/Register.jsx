import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, clearError } from '../store/slices/authSlice';

const Register = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { loading, error } = useSelector((state) => state.auth);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        gender: '',
    });

    const handleChange = (event) => {
        if (error) {
            dispatch(clearError());
        }
        setFormData({ ...formData, [event.target.name]: event.target.value });
    };

    const handleRegister = async (event) => {
        event.preventDefault();
        const payload = {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            password: formData.password,
            password_confirmation: formData.password_confirmation,
        };

        const result = await dispatch(registerUser(payload));
        if (registerUser.fulfilled.match(result)) {
            navigate('/patient');
        }
    };

    return (
        <div className="font-display bg-slate-100 text-slate-900 min-h-screen flex items-center justify-center p-4 lg:p-8">
            <div className="max-w-[1200px] w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                <div className="flex flex-col lg:flex-row">
                    <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-end p-12 overflow-hidden bg-slate-100 min-h-[760px]">
                        <div className="absolute inset-0 z-0">
                            <img alt="Professional healthcare environment" className="h-full w-full object-cover opacity-70" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6WY6oCynpmmMEMVqRLkiLhX-9fgIw5jKyZsx_e0fB_RF-ZTB8qVn6MXGyZYsm-YtE5Y69g8obtCB6R28Wqz3ljHY6WqQEJG-VWG1OrSMcxjB4EZM21cAft7oVmhKE8wiiaMfu47i0wp0UqAJvOLpAvGTRq3NNRea3JgSr9PXP1clg5Twg3MKBM7j9xIGr7huYumh7_ry3PdT-7fDfSCmsz1qbLiIoTItjIGgl_Zcn28OtVG3XQG0YVc9FMUZWgpN9Vzz24qCtff0b" />
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
                                <h2 className="text-2xl font-bold">HealthConnect</h2>
                            </div>

                            <div className="mb-8">
                                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Create Account</h2>
                                <p className="mt-2 text-slate-600">Join HealthConnect to manage your wellness journey.</p>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">error</span>
                                    {error}
                                </div>
                            )}

                            <form className="space-y-5" onSubmit={handleRegister}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">First Name</label>
                                        <input
                                            className="w-full rounded-lg border border-slate-300 bg-slate-100 focus:border-primary focus:ring-primary px-3 py-2"
                                            placeholder="John"
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Last Name</label>
                                        <input
                                            className="w-full rounded-lg border border-slate-300 bg-slate-100 focus:border-primary focus:ring-primary px-3 py-2"
                                            placeholder="Doe"
                                            type="text"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Email Address</label>
                                    <input
                                        className="w-full rounded-lg border border-slate-300 bg-slate-100 focus:border-primary focus:ring-primary px-3 py-2"
                                        placeholder="name@example.com"
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                                    <input
                                        className="w-full rounded-lg border border-slate-300 bg-slate-100 focus:border-primary focus:ring-primary px-3 py-2"
                                        placeholder="+44 (555) 000-0000"
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Password</label>
                                    <div className="relative">
                                        <input
                                            className="w-full rounded-lg border border-slate-300 bg-slate-100 focus:border-primary focus:ring-primary pr-10 px-3 py-2"
                                            placeholder="••••••••"
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                        />
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">visibility</span>
                                    </div>
                                    <div className="mt-2">
                                        <div className="flex gap-1 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div className="bg-primary w-2/3 h-full"></div>
                                            <div className="bg-transparent w-1/3 h-full"></div>
                                        </div>
                                        <p className="text-[10px] mt-1 text-slate-500 uppercase font-bold tracking-wider">Strength: Strong</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-slate-700">Gender</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input className="text-primary focus:ring-primary border-slate-300 bg-white" name="gender" type="radio" value="M" onChange={handleChange} />
                                            <span className="text-sm text-slate-600 group-hover:text-primary transition-colors">Male</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input className="text-primary focus:ring-primary border-slate-300 bg-white" name="gender" type="radio" value="F" onChange={handleChange} />
                                            <span className="text-sm text-slate-600 group-hover:text-primary transition-colors">Female</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input className="text-primary focus:ring-primary border-slate-300 bg-white" name="gender" type="radio" value="O" onChange={handleChange} />
                                            <span className="text-sm text-slate-600 group-hover:text-primary transition-colors">Other</span>
                                        </label>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                                    ) : (
                                        'Create Account'
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 text-center space-y-4">
                                <p className="text-sm text-slate-600">
                                    Already have an account?
                                    <Link to="/login" className="font-bold text-primary hover:underline ml-1">Sign In</Link>
                                </p>
                                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 rounded-full w-fit mx-auto">
                                    <span className="material-symbols-outlined text-green-600 text-sm">verified_user</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">HIPAA Compliant & Encrypted Data</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
