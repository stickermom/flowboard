import { useState } from 'react';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const { login, verifyTwoFactor } = useAdminAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'otp') {
      void handleVerifyOtp();
      return;
    }

    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      if (result.requiresOtp && result.challengeId) {
        setChallengeId(result.challengeId);
        setStep('otp');
        setError('');
        setLoading(false);
        return;
      }
      setError(result.error || 'Login failed');
    }

    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!challengeId) return;
    setError('');
    setLoading(true);
    const result = await verifyTwoFactor(challengeId, otpCode.trim());
    if (!result.success) {
      setError(result.error || 'Verification failed');
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/95 backdrop-blur-sm shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-8 pb-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-950 rounded-full mb-4 border border-neutral-700">
            <Lock size={32} className="text-neutral-100" />
          </div>
          <h1 className="text-3xl font-semibold text-neutral-50 mb-2">Store Admin</h1>
          <p className="text-neutral-400">Sign in to manage your store</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 'credentials' && (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-200 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 border border-neutral-700 rounded-lg bg-neutral-950 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-transparent"
                    placeholder="admin@example.com"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-200 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 border border-neutral-700 rounded-lg bg-neutral-950 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-transparent"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>
            </>
          )}

          {step === 'otp' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-900/80 p-4">
                <div className="rounded-full bg-neutral-800 p-2">
                  <ShieldCheck size={18} className="text-neutral-100" />
                </div>
                <div className="text-sm text-neutral-300">
                  Enter the {useRecoveryCode ? 'recovery code' : '6-digit code'} from your authenticator app to finish signing in.
                </div>
              </div>
              <label htmlFor="otp-code" className="block text-sm font-medium text-neutral-200">
                {useRecoveryCode ? 'Recovery code' : 'Authentication code'}
              </label>
              <input
                id="otp-code"
                type="text"
                inputMode={useRecoveryCode ? 'text' : 'numeric'}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
                autoFocus
                className="w-full tracking-[0.4em] text-center uppercase text-lg font-mono border border-neutral-700 rounded-lg bg-neutral-950 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-transparent py-3"
                placeholder={useRecoveryCode ? 'ABCD-EFGH' : '123456'}
              />
              <button
                type="button"
                onClick={() => {
                  setUseRecoveryCode(prev => !prev);
                  setOtpCode('');
                }}
                className="text-xs text-neutral-400 hover:text-neutral-100 transition-colors underline"
              >
                {useRecoveryCode ? 'Use authenticator code instead' : 'Use recovery code'}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-neutral-50 text-neutral-900 font-medium rounded-lg transition-colors hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait…' : step === 'otp' ? 'Verify code' : 'Sign In'}
          </button>

          {step === 'otp' && (
            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setChallengeId(null);
                setOtpCode('');
              }}
              className="w-full text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
            >
              Start over
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
