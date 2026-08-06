import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Button, InputField } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const register = useAppStore((state) => state.register);
  const navigate = useNavigate();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      register(name, email);
      setLoading(false);
      navigate('/app');
    }, 700);
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
            <li><Check size={18} /> Личный словарь и повторения</li>
            <li><Check size={18} /> Прогресс на всех устройствах</li>
            <li><Check size={18} /> Живые занятия в браузере</li>
          </ul>
        </div>
        <div className="auth-visual__decor auth-visual__decor--one" />
        <div className="auth-visual__decor auth-visual__decor--two" />
      </section>
      <section className="auth-form-section">
        <div className="auth-form-wrap">
          <Logo />
          <div className="auth-heading"><h1>Создать аккаунт</h1><p>Первый пробный урок доступен бесплатно.</p></div>
          <form className="auth-form" onSubmit={submit}>
            <InputField label="Имя и фамилия">
              <div className="input-with-icon"><UserRound size={18} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Анна Воронцова" required /></div>
            </InputField>
            <InputField label="Email">
              <div className="input-with-icon"><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></div>
            </InputField>
            <InputField label="Пароль" hint="Не менее 10 символов">
              <div className="input-with-icon"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} required /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </InputField>
            <label className="consent-line"><input type="checkbox" required /><span>Я принимаю <a href="#">пользовательское соглашение</a> и <a href="#">политику конфиденциальности</a>.</span></label>
            <Button size="lg" loading={loading} type="submit">Создать аккаунт</Button>
          </form>
          <p className="auth-switch">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
        </div>
      </section>
    </main>
  );
}
