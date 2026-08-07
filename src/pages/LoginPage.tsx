import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Button, InputField } from '../components/ui';
import { ApiError } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import type { User } from '../types';

function destinationFor(user: User): string {
  return user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/app';
}

export function LoginPage() {
  const [identifier, setIdentifier] = useState('student@example.local');
  const [password, setPassword] = useState('ChangeMe123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotLogin, setForgotLogin] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [devResetToken, setDevResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const login = useAppStore((state) => state.login);
  const loginAs = useAppStore((state) => state.loginAs);
  const forgotPassword = useAppStore((state) => state.forgotPassword);
  const resetPassword = useAppStore((state) => state.resetPassword);
  const user = useAppStore((state) => state.user);
  const authStatus = useAppStore((state) => state.authStatus);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    if (authStatus === 'authenticated' && user) {
      navigate(from ?? destinationFor(user), { replace: true });
    }
  }, [authStatus, from, navigate, user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedIn = await login(identifier, password);
      navigate(from ?? destinationFor(loggedIn), { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Не удалось выполнить вход');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (role: 'student' | 'teacher' | 'admin') => {
    setError('');
    setLoading(true);
    try {
      const loggedIn = await loginAs(role);
      navigate(destinationFor(loggedIn), { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Не удалось войти тестовым пользователем');
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async () => {
    const value = (forgotLogin || identifier).trim();
    if (!value) return;
    setForgotLoading(true);
    setError('');
    try {
      const token = await forgotPassword(value);
      setDevResetToken(token ?? '');
      if (!token) setForgotOpen(false);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Не удалось отправить запрос на сброс пароля');
    } finally {
      setForgotLoading(false);
    }
  };

  const submitReset = async () => {
    if (!devResetToken || newPassword.length < 10) return;
    setForgotLoading(true);
    setError('');
    try {
      await resetPassword(devResetToken, newPassword);
      setPassword(newPassword);
      setNewPassword('');
      setDevResetToken('');
      setForgotOpen(false);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Не удалось изменить пароль');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Link to="/" className="auth-back"><ArrowLeft size={18} /> На главную</Link>
        <div className="auth-visual__content">
          <span className="auth-quote">“</span>
          <h2>Небольшой урок сегодня — уверенная речь завтра.</h2>
          <p>Продолжайте с того места, где остановились. Прогресс, словарь и расписание уже ждут вас.</p>
          <div className="auth-feature"><ShieldCheck size={19} /><span>Вход по Email или номеру телефона через реальный backend</span></div>
        </div>
        <div className="auth-visual__decor auth-visual__decor--one" />
        <div className="auth-visual__decor auth-visual__decor--two" />
      </section>
      <section className="auth-form-section">
        <div className="auth-form-wrap">
          <Logo />
          <div className="auth-heading"><h1>С возвращением</h1><p>Введите Email или номер телефона.</p></div>
          {error ? <div className="auth-server-error" role="alert">{error}</div> : null}
          <form className="auth-form" onSubmit={submit}>
            <InputField label="Email или номер телефона">
              <div className="input-with-icon"><KeyRound size={18} /><input type="text" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" placeholder="student@example.local или +7 999..." required /></div>
            </InputField>
            <InputField label="Пароль">
              <div className="input-with-icon"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={1} autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </InputField>
            <div className="auth-options"><label><input type="checkbox" defaultChecked disabled /> Сессия сохраняется безопасной cookie</label><button type="button" onClick={() => { setForgotOpen((value) => !value); setForgotLogin(identifier); }}>Забыли пароль?</button></div>
            {forgotOpen ? (
              <div className="auth-inline-panel">
                <strong>Восстановление пароля</strong>
                <p>Укажите Email или телефон. В production ссылка/код уйдёт через подключённый канал.</p>
                <input value={forgotLogin} onChange={(event) => setForgotLogin(event.target.value)} placeholder="Email или телефон" />
                <Button type="button" variant="secondary" loading={forgotLoading} onClick={submitForgot}>Отправить</Button>
                {devResetToken ? (
                  <>
                    <code className="dev-token">DEV token: {devResetToken}</code>
                    <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Новый пароль, минимум 10 символов" minLength={10} />
                    <Button type="button" loading={forgotLoading} onClick={() => void submitReset()}>Установить новый пароль</Button>
                  </>
                ) : null}
              </div>
            ) : null}
            <Button size="lg" loading={loading} type="submit">Войти</Button>
          </form>
          {import.meta.env.VITE_SHOW_DEV_LOGIN !== 'false' ? (
            <>
              <div className="auth-divider"><span>development seed users</span></div>
              <div className="demo-login-grid">
                <button type="button" disabled={loading} onClick={() => void quickLogin('student')}><strong>Ученик</strong><span>student@example.local</span></button>
                <button type="button" disabled={loading} onClick={() => void quickLogin('teacher')}><strong>Преподаватель</strong><span>teacher@example.local</span></button>
                <button type="button" disabled={loading} onClick={() => void quickLogin('admin')}><strong>Администратор</strong><span>admin@example.local</span></button>
              </div>
            </>
          ) : null}
          <p className="auth-switch">Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
        </div>
      </section>
    </main>
  );
}
