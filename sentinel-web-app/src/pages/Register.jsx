/*
 * SentinelMesh — Register Page
 * Reference: stitch_sentinel_mesh_safety_app/register
 * Supports Device User and Community Responder roles.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [role, setRole] = useState('tourist');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name, phone, role);
      navigate(role === 'tourist' ? '/' : '/admin');
    } catch (err) {
      setError(
        err.code === 'auth/email-already-in-use'
          ? 'An account with this email already exists.'
          : 'Registration failed. Please try again.'
      );
    }
    setLoading(false);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] flex flex-col gap-6 animate-fade-in">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2 pt-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-3xl material-symbols-filled">
              shield_with_heart
            </span>
            <span className="text-2xl font-bold text-primary tracking-tight">
              TravelRakshak
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface mt-2">Create Account</h1>
          <p className="text-on-surface-variant">
            Start your journey to radical clarity and safety.
          </p>
        </div>

        {/* Role Toggle */}
        <div className="bg-surface-container-high rounded-2xl p-1.5 flex">
          <button
            type="button"
            onClick={() => setRole('tourist')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              role === 'tourist'
                ? 'bg-white text-on-surface shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            🧳 Tourist
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              role === 'admin'
                ? 'bg-white text-on-surface shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            🛡️ Admin
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-on-surface-variant px-1" htmlFor="reg-name">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              placeholder="Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-14 px-4 bg-[#EDF2F7] border-2 border-transparent rounded-xl text-base outline-none transition-all input-focus"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-on-surface-variant px-1" htmlFor="reg-email">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              placeholder="alex@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 px-4 bg-[#EDF2F7] border-2 border-transparent rounded-xl text-base outline-none transition-all input-focus"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-on-surface-variant px-1" htmlFor="reg-phone">
              Phone Number
            </label>
            <input
              id="reg-phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-14 px-4 bg-[#EDF2F7] border-2 border-transparent rounded-xl text-base outline-none transition-all input-focus"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-on-surface-variant px-1" htmlFor="reg-password">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 px-4 bg-[#EDF2F7] border-2 border-transparent rounded-xl text-base outline-none transition-all input-focus"
              required
              minLength={6}
            />
          </div>

          {/* Role Info Callout */}
          <div className="bg-primary-fixed/30 rounded-2xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-xl mt-0.5">info</span>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {role === 'tourist'
                ? "For tourists using TravelRakshak's safety services."
                : "For authorized authorities managing tourist safety and emergency response."}
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary hover:bg-primary-container text-white font-semibold rounded-xl shadow-md transition-all btn-press flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pb-6">
          <p className="text-on-surface-variant">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold ml-1 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
