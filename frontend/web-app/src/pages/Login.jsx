import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../store/slices/authSlice';

const Login = () => {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { loading, error } = useSelector((state) => state.auth);

    const handleChange = (event) => {
        if (error) {
            dispatch(clearError());
        }
        setCredentials({ ...credentials, [event.target.name]: event.target.value });
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        const result = await dispatch(loginUser(credentials));
        if (loginUser.fulfilled.match(result)) {
            const role = result.payload.user?.roleId;
            if (role === 'R1') navigate('/admin/dashboard');
            else if (role === 'R2') navigate('/doctor');
            else navigate('/patient');
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-display text-slate-900">
            <div className="max-w-[1000px] w-full bg-white rounded-xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-slate-200">
                <div className="hidden md:flex md:w-1/2 bg-slate-100 relative items-center justify-center p-12">
                    <div
                        className="absolute inset-0 opacity-30 bg-cover bg-center"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB-Ssvbl05nBWkRILBiiLDP3KvOU2PDskIbzsSXHTRn1YUnFmQ_arg9y1o1D5kcJUZAac6iwkHXG0GVGTBut9yPz6XAs6mgINE14BvEGdI-TMAJn-tqYn7RAtOU2IZrTmwGc5Unk73B9H_4MrSiZnGmcTmFTzXXvp0c94BsoKzicMmk54fBJ2APevfkadSOJSiHq08p7I6DkuNCODSVbh8LkmT3hCfacXc31toCzSIHm-2RsLOKeVMDVayufJ9mHegBmG66WJL1R4xm')" }}
                    ></div>
                    <div className="absolute inset-0 bg-white/60"></div>
                    <div className="relative z-10 text-center">
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <div className="p-3 bg-primary rounded-xl text-white shadow-lg">
                                <span className="material-symbols-outlined text-4xl">medical_services</span>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-4">
                            Healthcare, <br /><span className="text-primary">In Sync.</span>
                        </h1>
                        <p className="text-slate-600 text-lg">
                            Access your medical records, book appointments, and chat with your doctors in one secure place.
                        </p>
                    </div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full -translate-x-1/2 translate-y-1/2"></div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full translate-x-1/3 -translate-y-1/3"></div>
                </div>

                <div className="w-full md:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
                    <div className="mb-10">
                        <div className="flex items-center gap-2 mb-8 md:hidden">
                            <span className="material-symbols-outlined text-primary text-3xl">medical_services</span>
                            <span className="text-xl font-bold text-slate-900">HealthConnect</span>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
                        <p className="text-slate-500">Please enter your details to access your health portal.</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                                <input
                                    className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900"
                                    placeholder="name@company.com"
                                    type="email"
                                    name="email"
                                    value={credentials.email}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                                <input
                                    className="w-full pl-10 pr-12 py-3 bg-slate-100 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900"
                                    placeholder="••••••••"
                                    type="password"
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleChange}
                                />
                                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors" type="button">
                                    <span className="material-symbols-outlined">visibility</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4" type="checkbox" />
                                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Remember me</span>
                            </label>
                            <a className="text-sm font-semibold text-primary hover:underline" href="#">Forgot password?</a>
                        </div>

                        <button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60" type="submit" disabled={loading}>
                            {loading ? (
                                <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                            ) : (
                                <>
                                    Sign In
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </>
                            )}
                        </button>

                        <div className="relative flex items-center py-4">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink mx-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Or continue with</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button className="flex items-center justify-center gap-2 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700" type="button">
                                <img alt="Google" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbAh_U3H1HDxNMXm28jCa9WRhbZqz69sH6u5uPlzLRF5oqQZMO-XyvVMilQ9WiymwE_jqQ8SzlqGxFm_PxLBNtXeygzqXmnJc0KNvLx4qHu3q8mpbKXnL8HB1SeD57d5V63MHI9athqAje__7J-R8s_IDSbaL0g3XXigTV21GUBofUojVo_951QJPpzW-zOTKnjjwUCvz4nMlwX6jCmX-XckYrE3xHQUbS6FUmqdKtkVWV3h3GlMVd9JJ7e59WNQD6f-VXblAkk4QY" />
                                <span className="text-sm font-semibold">Google</span>
                            </button>
                            <button className="flex items-center justify-center gap-2 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700" type="button">
                                <span className="material-symbols-outlined text-xl">ios</span>
                                <span className="text-sm font-semibold">Apple</span>
                            </button>
                        </div>
                    </form>

                    <p className="mt-8 text-center text-slate-600">
                        Don't have an account?
                        <Link to="/register" className="text-primary font-bold hover:underline ml-1">Sign up for free</Link>
                    </p>

                    <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-center gap-2 text-slate-500">
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        <span className="text-xs font-medium tracking-tight">HIPAA Compliant & Encrypted Data</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
