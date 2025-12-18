
import React, { useState, useEffect, useRef, useId } from 'react';
import { authService } from '../services/authService';
import { useLanguage } from '../contexts/LanguageContext';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved'>('idle');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const successTimerRef = useRef<number | null>(null);
  const titleId = useId();
  const resetTimer = () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  };
  const validatePassword = (pass: string) => {
    if (pass.length < 6) return t('auth.passwordTooShort');
    // Add more complexity checks here if needed (e.g., numbers, symbols)
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    // Validation
    const passError = validatePassword(newPassword);
    if (passError) {
      setError(passError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsNoMatch'));
      return;
    }

    if (currentPassword === newPassword) {
      setError(t('auth.passwordSame'));
      return;
    }

    setStatus('loading');
    console.log('[ChangePasswordModal] status -> loading');
    try {
      await authService.changePassword(currentPassword, newPassword);
      console.log('[ChangePasswordModal] changePassword resolved');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatus('saved');
      console.log('[ChangePasswordModal] status -> saved');
      setSuccess(t('auth.passwordChanged'));
      onSaved?.();
      resetTimer();
      successTimerRef.current = window.setTimeout(() => {
        setStatus('idle');
        setSuccess('');
        onClose();
      }, 400);
    } catch (e: any) {
      const serverMessage = e?.message || e?.error_description || t('auth.errorChangePassword');
      if (serverMessage.toLowerCase().includes('password') || e.code === 'auth/wrong-password') {
        setError(t('auth.incorrectPassword'));
      } else {
        setError(serverMessage);
      }
      setStatus('idle');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      resetTimer();
      setStatus('idle');
      setError('');
      setSuccess('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      resetTimer();
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative"
      >
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 id={titleId} className="font-bold text-slate-800">{t('auth.changePassword')}</h3>
          <button type="button" onClick={onClose}>
            <i className="fa-solid fa-xmark text-slate-400 hover:text-slate-600 text-xl"></i>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-100 text-green-700 text-xs rounded-lg flex items-center gap-2">
              <i className="fa-solid fa-check-circle"></i>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">{t('auth.currentPassword')}</label>
              <input 
                type="password" 
                required 
                value={currentPassword} 
                onChange={e => setCurrentPassword(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900"
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">{t('auth.newPassword')}</label>
              <input 
                type="password" 
                required 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">{t('auth.confirmPassword')}</label>
              <input 
                type="password" 
                required 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary-500/30 transition-all flex justify-center items-center gap-2 mt-2"
            >
              {status === 'loading' && <i className="fa-solid fa-circle-notch fa-spin"></i>}
              {status === 'saved' ? t('auth.saved') : t('auth.savePassword')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
