import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Button, InputField } from '../components/ui';
import { ApiError } from '../services/api';
import { useAppStore } from '../store/useAppStore';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const register = useAppStore((state) => state.register);
  const navigate = useNavigate();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Проверьте номер телефона: должно быть не менее 10 цифр.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(name.trim(), email.trim(), phone.trim(), password);
      navigate('/app/profile', { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'Не удалось создать аккаунт');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page auth-page--register">
      <section className="auth-visual">
        <Link to="/" className="auth-back"><ArrowLeft size={18} /> На главную</Link>
        <div className="auth-visual__content">
          <span className="eyebrow eyebrow--light">Всё в одном месте</span>
          <h2>Учитесь в своём темпе, но не оставайтесь без поддержки.</h2>
          <ul className="auth-benefits">
            <li><Check size={18} /> Бесплатные пробные уроки</li>
            <li><Check size={18} /> Личный словарь и интервальные повторения</li>
            <li><Check size={18} /> Индивидуальные и групповые занятия</li>
            <li><Check size={18} /> Профиль и сессия сохраняются на backend</li>
          </ul>
        </div>
        <div className="auth-visual__decor auth-visual__decor--one" />
        <div className="auth-visual__decor auth-visual__decor--two" />
      </section>
      <section className="auth-form-section">
        <div className="auth-form-wrap">
          <Logo />
          <div className="auth-heading"><h1>Создать аккаунт</h1><p>Телефон обязателен и может использоваться для входа.</p></div>
          {error ? <div className="auth-server-error" role="alert">{error}</div> : null}
          <form className="auth-form" onSubmit={submit}>
            <InputField label="Имя и фамилия">
              <div className="input-with-icon"><UserRound size={18} /><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Анна Смирнова" required /></div>
            </InputField>
            <InputField label="Email">
              <div className="input-with-icon"><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div>
            </InputField>
            <InputField label="Номер телефона" hint="Обязательное поле. Например: +7 999 123-45-67">
              <div className="input-with-icon"><Phone size={18} /><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="+7 999 123-45-67" pattern="[+0-9()\-\s]{10,}" required /></div>
            </InputField>
            <InputField label="Пароль" hint="Минимум 10 символов">
              <div className="input-with-icon"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={10} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Показать пароль">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </InputField>
            <label className="consent-line"><input type="checkbox" required /> Я принимаю <Link to="#">условия использования</Link> и <Link to="#">политику обработки данных</Link>.</label>
            <Button size="lg" loading={loading} type="submit">Создать аккаунт</Button>
          </form>
          <p className="auth-switch">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
        </div>
      </section>
    </main>
  );
}
