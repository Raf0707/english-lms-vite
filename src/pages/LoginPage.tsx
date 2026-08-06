import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Button, InputField } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

export function LoginPage() {
  const [email, setEmail] = useState('student@lingua.demo');
  const [password, setPassword] = useState('Demo123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAppStore((state) => state.login);
  const loginAs = useAppStore((state) => state.loginAs);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      login(email);
      setLoading(false);
      const roleDestination = email.includes('admin') ? '/admin' : email.includes('teacher') ? '/teacher' : '/app';
      navigate(from ?? roleDestination, { replace: true });
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
          <div className="auth-feature"><ShieldCheck size={19} /><span>Данные и учебный прогресс сохраняются безопасно</span></div>
        </div>
        <div className="auth-visual__decor auth-visual__decor--one" />
        <div className="auth-visual__decor auth-visual__decor--two" />
      </section>
      <section className="auth-form-section">
        <div className="auth-form-wrap">
          <Logo />
          <div className="auth-heading"><h1>С возвращением</h1><p>Войдите, чтобы продолжить обучение.</p></div>
          <form className="auth-form" onSubmit={submit}>
            <InputField label="Email">
              <div className="input-with-icon"><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
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
