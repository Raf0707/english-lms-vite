import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Button, InputField } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('student@lingua.demo');
  const [password, setPassword] = useState('Demo123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAppStore((state) => state.login);
  const loginAs = useAppStore((state) => state.loginAs);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const roleDestination = (value: string) => {
    const lower = value.toLowerCase();
    const digits = value.replace(/\D/g, '');
    if (lower.includes('admin') || digits.endsWith('0000001')) return '/admin';
    if (lower.includes('teacher') || digits.endsWith('2223344')) return '/teacher';
    return '/app';
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      login(identifier);
      setLoading(false);
      navigate(from ?? roleDestination(identifier), { replace: true });
    }, 650);
  };

  const quickLogin = (role: 'student' | 'teacher' | 'admin') => {
    loginAs(role);
    navigate(role === 'student' ? '/app' : role === 'teacher' ? '/teacher' : '/admin');
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Link to="/" className="auth-back"><ArrowLeft size={18} /> На главную</Link>
        <div className="auth-visual__content">
          <span className="auth-quote">“</span>
          <h2>Небольшой урок сегодня — уверенная речь завтра.</h2>
          <p>Продолжайте с того места, где остановились. Прогресс, словарь и расписание уже ждут вас.</p>
          <div className="auth-feature"><ShieldCheck size={19} /><span>Войти можно по Email или по номеру телефона</span></div>
        </div>
        <div className="auth-visual__decor auth-visual__decor--one" />
        <div className="auth-visual__decor auth-visual__decor--two" />
      </section>
      <section className="auth-form-section">
        <div className="auth-form-wrap">
          <Logo />
          <div className="auth-heading"><h1>С возвращением</h1><p>Введите Email или номер телефона.</p></div>
          <form className="auth-form" onSubmit={submit}>
            <InputField label="Email или номер телефона">
              <div className="input-with-icon"><KeyRound size={18} /><input type="text" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" placeholder="student@lingua.demo или +7 999..." required /></div>
            </InputField>
            <InputField label="Пароль">
              <div className="input-with-icon"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </InputField>
            <div className="auth-options"><label><input type="checkbox" defaultChecked /> Запомнить меня</label><button type="button">Забыли пароль?</button></div>
            <Button size="lg" loading={loading} type="submit">Войти</Button>
          </form>
          <div className="auth-divider"><span>или открыть демо</span></div>
          <div className="demo-login-grid">
            <button onClick={() => quickLogin('student')}><strong>Ученик</strong><span>Курсы и словарь</span></button>
            <button onClick={() => quickLogin('teacher')}><strong>Преподаватель</strong><span>Контент и занятия</span></button>
            <button onClick={() => quickLogin('admin')}><strong>Администратор</strong><span>Управление LMS</span></button>
          </div>
          <p className="auth-switch">Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
        </div>
      </section>
    </main>
  );
}
