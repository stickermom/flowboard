import { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          setError(error.message || 'Failed to create account');
        } else {
          setSuccess('Account created! Please check your email to verify your account.');
          setTimeout(() => {
            setMode('login');
            setSuccess('');
          }, 3000);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message || 'Invalid credentials');
        } else {
          setSuccess('Login successful!');
          setTimeout(() => {
            onClose();
            setSuccess('');
          }, 1000);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message || 'Failed to sign in with Google');
      setLoading(false);
    }
    // OAuth redirect will happen, so we don't set loading to false
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setFullName('');
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200/50">
            <h2 className="text-xl font-bold text-gray-800">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-sm">
                <AlertCircle size={16} />
                {success}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={loading || authLoading}
              className="w-full mb-4 px-4 py-3 bg-white/60 backdrop-blur-md border border-gray-300/50 rounded-lg hover:bg-white/80 transition-all flex items-center justify-center gap-3 font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white/60 backdrop-blur-md border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-white/60 backdrop-blur-md border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                      placeholder="you@example.com"
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-2 bg-white/60 backdrop-blur-md border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                      placeholder="••••••••"
                    />
                </div>
                {mode === 'signup' && (
                  <p className="mt-1 text-xs text-gray-500">At least 6 characters</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || authLoading}
                className="w-full py-3 px-4 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  <>
                    {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              </span>
              <button
                onClick={switchMode}
                className="text-gray-800 hover:text-gray-900 font-medium"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

