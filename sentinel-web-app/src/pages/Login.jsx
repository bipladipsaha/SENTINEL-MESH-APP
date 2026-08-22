/*
 * SentinelMesh — Login Page
 * Reference: stitch_sentinel_mesh_safety_app/login
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(
        err.code === 'auth/invalid-credential'
          ? 'Invalid email or password.'
          : 'Failed to log in. Please try again.'
      );
    }
    setLoading(false);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] flex flex-col gap-8 animate-fade-in">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-4xl material-symbols-filled">
              shield_with_heart
            </span>
            <h1 className="text-3xl font-bold text-primary tracking-tight">
              TravelRakshak
            </h1>
          </div>
          <p className="text-on-surface-variant max-w-[320px]">
            Securing your world with human-centric protection and radical clarity.
          </p>
        </div>

        {/* Illustration Card */}
        <div className="w-full bg-white rounded-3xl card-shadow overflow-hidden p-6 flex flex-col items-center gap-4 border border-surface-container">
          <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-primary text-7xl material-symbols-filled opacity-30">
                security
              </span>
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-on-surface">Welcome Back</h2>
            <p className="text-on-surface-variant">Please enter your details to continue.</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-on-surface-variant px-1" htmlFor="login-email">
              Email Address
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                <span className="material-symbols-outlined text-[20px]">mail</span>
              </div>
              <input
                id="login-email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-[#EDF2F7] border-2 border-transparent rounded-xl text-base outline-none transition-all input-focus"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-sm font-semibold text-on-surface-variant" htmlFor="login-password">
                Password
              </label>
              <a className="text-xs font-medium text-primary hover:underline" href="#">
                Forgot Password?
              </a>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 pl-12 pr-12 bg-[#EDF2F7] border-2 border-transparent rounded-xl text-base outline-none transition-all input-focus"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-primary transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary hover:bg-primary-container text-white font-semibold rounded-xl shadow-md transition-all btn-press mt-2 flex items-center justify-center gap-2 group disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Logging in...
              </>
            ) : (
              <>
                <span>Login</span>
                <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pt-2">
          <p className="text-on-surface-variant">
            New to TravelRakshak?{' '}
            <Link to="/register" className="text-primary font-semibold ml-1 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
