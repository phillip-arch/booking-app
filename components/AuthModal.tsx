
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { emailService } from '../services/emailService';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

type AuthView = 'login' | 'register' | 'forgot';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const { t } = useLanguage();
  const [view, setView] = useState<AuthView>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setJoinCode('');
    setError('');
    setSuccessMsg('');
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (view === 'login') {
        const user = await authService.login(email, password);
        onLoginSuccess(user);
        resetForm();
        onClose();
      } else if (view === 'register') {
        const user = await authService.register(name, email, password, joinCode);
        
        // Send Welcome Email
        await emailService.sendWelcomeEmail(user);

        onLoginSuccess(user);
        resetForm();
        onClose();
      } else if (view === 'forgot') {
        await authService.resetPassword(email);
        setSuccessMsg(t('auth.sentLink'));
        setTimeout(() => {
          setView('login');
          setSuccessMsg('');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">
            {view === 'login' && t('auth.login')}
            {view === 'register' && t('auth.register')}
            {view === 'forgot' && t('auth.forgot')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}
          
          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-100 text-green-700 text-sm rounded-lg flex items-center gap-2">
              <i className="fa-solid fa-check-circle"></i>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {view === 'register' && (
              <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">{t('label.name')}</label>
                <div className="relative">
                  <i className="fa-solid fa-user absolute left-3 top-3 text-slate-400 text-sm"></i>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">{t('label.email')}</label>
              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-3 top-3 text-slate-400 text-sm"></i>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {view !== 'forgot' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">{t('auth.password')}</label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-3 top-3 text-slate-400 text-sm"></i>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}
            
            {/* Join Code Input (Only Register) */}
            {view === 'register' && (
              <div className="space-y-1 animate-fade-in pt-2">
                <label className="text-xs font-semibold text-primary-600 uppercase flex items-center gap-1">
                   <i className="fa-solid fa-building"></i> {t('auth.joinCode')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-primary-50 text-slate-900 font-mono tracking-wider"
                    placeholder={t('auth.joinCodePlaceholder')}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary-500/30 transition-all flex justify-center items-center gap-2 mt-4"
            >
              {loading && <i className="fa-solid fa-circle-notch fa-spin"></i>}
              {view === 'login' && t('auth.login')}
              {view === 'register' && t('auth.register')}
              {view === 'forgot' && t('auth.sendLink')}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-500 space-y-2">
            {view === 'login' && (
              <>
                <p>
                  {t('auth.noAccount')}{' '}
                  <button onClick={() => { setView('register'); resetForm(); }} className="text-primary-600 font-semibold hover:underline">
                    {t('auth.register')}
                  </button>
                </p>
                <button onClick={() => { setView('forgot'); resetForm(); }} className="text-slate-400 hover:text-slate-600 text-xs">
                  {t('auth.forgot')}
                </button>
              </>
            )}
            
            {view === 'register' && (
              <p>
                {t('auth.hasAccount')}{' '}
                <button onClick={() => { setView('login'); resetForm(); }} className="text-primary-600 font-semibold hover:underline">
                  {t('auth.login')}
                </button>
              </p>
            )}

            {view === 'forgot' && (
              <button onClick={() => { setView('login'); resetForm(); }} className="text-primary-600 font-semibold hover:underline">
                {t('auth.backSignIn')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
