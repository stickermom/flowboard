'use client';

import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Smartphone,
  KeyRound,
  CheckCircle2,
  QrCode,
  Copy,
  AlertTriangle,
  Lock
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const OTP_ISSUER = 'Flowboard Admin';

type PanelMode = 'none' | 'setup' | 'disable';

export default function SettingsPage() {
  const {
    adminUser,
    startTwoFactorSetup,
    confirmTwoFactorSetup,
    disableTwoFactor
  } = useAdminAuth();

  const twoFactorEnabled = !!adminUser?.twoFactorEnabled;
  const [panelMode, setPanelMode] = useState<PanelMode>('none');

  const [setupPassword, setSetupPassword] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [setupRecoveryCodes, setSetupRecoveryCodes] = useState<string[]>([]);
  const [setupCode, setSetupCode] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disableUseRecovery, setDisableUseRecovery] = useState(false);

  const [panelError, setPanelError] = useState('');
  const [panelSuccess, setPanelSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const resetPanelState = () => {
    setSetupPassword('');
    setSetupSecret('');
    setSetupRecoveryCodes([]);
    setSetupCode('');
    setQrDataUrl('');
    setDisablePassword('');
    setDisableCode('');
    setDisableUseRecovery(false);
    setPanelError('');
    setPanelSuccess('');
    setBusy(false);
  };

  const closePanel = () => {
    setPanelMode('none');
    resetPanelState();
  };

  const handleBeginSetup = () => {
    setPanelMode('setup');
    resetPanelState();
  };

  const handleBeginDisable = () => {
    setPanelMode('disable');
    resetPanelState();
  };

  useEffect(() => {
    if (!setupSecret || !adminUser?.email) {
      setQrDataUrl('');
      return;
    }

    const generateQr = async () => {
      try {
        const label = encodeURIComponent(`${OTP_ISSUER}:${adminUser.email}`);
        const issuer = encodeURIComponent(OTP_ISSUER);
        const otpauth = `otpauth://totp/${label}?secret=${setupSecret}&issuer=${issuer}&digits=6&period=30`;
        const dataUrl = await QRCode.toDataURL(otpauth);
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('QR generation failed', err);
        setQrDataUrl('');
      }
    };

    void generateQr();
  }, [setupSecret, adminUser?.email]);

  const handleGenerateSecret = async () => {
    setPanelError('');
    setPanelSuccess('');
    setBusy(true);
    const result = await startTwoFactorSetup(setupPassword);
    if (result.error) {
      setPanelError(result.error);
      setBusy(false);
      return;
    }
    setSetupSecret(result.secret ?? '');
    setSetupRecoveryCodes(result.recoveryCodes ?? []);
    setBusy(false);
  };

  const handleConfirmSetup = async () => {
    if (!setupSecret) return;
    setPanelError('');
    setBusy(true);
    const result = await confirmTwoFactorSetup(setupPassword, setupCode.trim());
    if (!result.success) {
      setPanelError(result.error || 'Unable to confirm setup');
      setBusy(false);
      return;
    }
    setPanelSuccess('Two-factor authentication is enabled.');
    setBusy(false);
    setTimeout(() => {
      closePanel();
    }, 1200);
  };

  const handleDisable = async () => {
    setPanelError('');
    setBusy(true);
    const result = await disableTwoFactor(disablePassword, disableCode.trim());
    if (!result.success) {
      setPanelError(result.error || 'Unable to disable 2FA');
      setBusy(false);
      return;
    }
    setPanelSuccess('Two-factor authentication has been disabled.');
    setBusy(false);
    setTimeout(() => {
      closePanel();
    }, 1200);
  };

  const buttonLabel = twoFactorEnabled ? 'Manage 2FA' : 'Set up 2FA';

  const renderPanel = () => {
    if (panelMode === 'none') return null;

    if (panelMode === 'disable') {
      return (
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-3">
              <Lock size={36} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Disable two-factor authentication</h3>
              <p className="text-sm text-slate-600 dark:text-neutral-400 mt-2">
                Enter your password and a current authenticator code (or a recovery code) to turn off 2FA for this account.
              </p>
            </div>
          </div>

          {panelError && (
            <p className="text-sm text-red-400 bg-red-500/5 border border-red-500/30 rounded-lg px-3 py-2">{panelError}</p>
          )}
          {panelSuccess && (
            <p className="text-sm text-green-400 bg-green-500/5 border border-green-500/30 rounded-lg px-3 py-2">{panelSuccess}</p>
          )}

          <label className="block text-sm font-medium text-slate-800 dark:text-neutral-300">
            Account password
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </label>

          <label className="block text-sm font-medium text-slate-800 dark:text-neutral-300">
            {disableUseRecovery ? 'Recovery code' : 'Authentication code'}
            <input
              type="text"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/60 px-3 py-2 text-sm uppercase tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder={disableUseRecovery ? 'ABCD-EFGH' : '123456'}
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setDisableUseRecovery((prev) => !prev);
              setDisableCode('');
            }}
            className="text-xs text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-100"
          >
            {disableUseRecovery ? 'Use authenticator code instead' : 'Use recovery code instead'}
          </button>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closePanel}
              className="text-sm text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDisable}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-500 disabled:opacity-50"
            >
              Disable 2FA
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-3">
            <QrCode size={48} className="text-slate-400 dark:text-neutral-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Pair your authenticator</h3>
            <ol className="mt-3 space-y-2 text-sm text-slate-600 dark:text-neutral-400 list-decimal list-inside">
              <li>Enter your account password to generate a setup key.</li>
              <li>Scan the QR code or enter the setup key in your authenticator.</li>
              <li>Confirm with the 6-digit code from your authenticator app.</li>
            </ol>
          </div>
        </div>

        {panelError && (
          <p className="text-sm text-red-400 bg-red-500/5 border border-red-500/30 rounded-lg px-3 py-2">{panelError}</p>
        )}
        {panelSuccess && (
          <p className="text-sm text-green-400 bg-green-500/5 border border-green-500/30 rounded-lg px-3 py-2">{panelSuccess}</p>
        )}

        {!setupSecret && (
          <label className="block text-sm font-medium text-slate-800 dark:text-neutral-300">
            Account password
            <input
              type="password"
              value={setupPassword}
              onChange={(e) => setSetupPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </label>
        )}

        {setupSecret && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR code" className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white" />
              ) : (
                <div className="h-48 rounded-lg border border-dashed border-slate-300 dark:border-neutral-700 flex items-center justify-center text-sm text-slate-500">
                  Generating QR…
                </div>
              )}
              <p className="text-xs text-slate-500 dark:text-neutral-500">
                If you can&apos;t scan the QR code, enter the setup key manually in your authenticator app.
              </p>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-dashed border-slate-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/80 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-500 font-semibold mb-2">Setup key</p>
                <code className="text-sm font-mono tracking-[0.3em] text-slate-900 dark:text-neutral-200 break-all">
                  {setupSecret}
                </code>
              </div>
              {setupRecoveryCodes.length > 0 && (
                <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Recovery codes</p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(setupRecoveryCodes.join('\n'));
                          setPanelSuccess('Recovery codes copied to clipboard.');
                        } catch (err) {
                          console.error('Copy failed', err);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                    >
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                  <ul className="grid grid-cols-2 gap-2 text-sm font-mono text-slate-800 dark:text-neutral-200">
                    {setupRecoveryCodes.map((code) => (
                      <li key={code} className="rounded border border-slate-200 dark:border-neutral-800 px-2 py-1 tracking-[0.2em] text-center">
                        {code}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-500 dark:text-neutral-500">
                    Store these codes securely. Each code can be used once if you lose access to your authenticator app.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {setupSecret && (
          <label className="block text-sm font-medium text-slate-800 dark:text-neutral-300">
            6-digit verification code
            <input
              type="text"
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/60 px-3 py-2 text-sm tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="123456"
            />
          </label>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={closePanel}
            className="text-sm text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          >
            Cancel
          </button>
          {!setupSecret ? (
            <button
              type="button"
              onClick={handleGenerateSecret}
              disabled={busy || !setupPassword}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-medium hover:bg-slate-800 dark:hover:bg-neutral-200 disabled:opacity-50"
            >
              Generate setup key
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmSetup}
              disabled={busy || setupCode.length < 6}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-medium hover:bg-slate-800 dark:hover:bg-neutral-200 disabled:opacity-50"
            >
              Confirm setup
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-600 dark:text-neutral-400 mt-1">
          Manage the security and preferences for your storefront administration.
        </p>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm">
        <header className="flex items-start gap-4 border-b border-slate-200 dark:border-neutral-800 px-6 py-5">
          <div className="bg-slate-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg p-2.5">
            <ShieldCheck size={22} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Two-factor authentication</h2>
            <p className="text-sm text-slate-600 dark:text-neutral-400 mt-1">
              Add an additional layer of protection to every admin sign-in.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 text-sm font-medium ${
              twoFactorEnabled
                ? 'text-green-600 dark:text-green-400'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            <CheckCircle2
              size={18}
              className={twoFactorEnabled ? 'text-green-500' : 'text-slate-300 dark:text-neutral-500'}
            />
            {twoFactorEnabled ? 'Enabled' : 'Not enabled'}
          </span>
        </header>

        <div className="px-6 py-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-slate-100 dark:bg-neutral-800 p-2">
                <Smartphone size={18} className="text-slate-700 dark:text-neutral-200" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Secure every login with an authenticator app
                </p>
                <p className="text-sm text-slate-600 dark:text-neutral-400">
                  Scan a QR code or enter a setup key to pair your device. You&apos;ll receive a 6-digit code each time you sign in.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleBeginSetup}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <KeyRound size={16} />
                {buttonLabel}
              </button>
              {twoFactorEnabled && (
                <button
                  onClick={handleBeginDisable}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50"
                >
                  Disable 2FA
                </button>
              )}
            </div>
          </div>

          {renderPanel()}
        </div>
      </section>

      <section className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Notification preferences</h2>
          <p className="text-sm text-slate-600 dark:text-neutral-400 mt-1">
            Email and SMS alerts for new orders and low inventory are coming soon.
          </p>
        </div>
      </section>

      <section className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-sm">
        <div className="px-6 py-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Need to transfer access?</h3>
            <p className="text-sm text-slate-600 dark:text-neutral-400">
              Contact the platform administrator to rotate credentials or update the list of trusted devices.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
