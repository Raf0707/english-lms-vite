import { Bell, Camera, CheckCircle2, KeyRound, Laptop, LogOut, Mail, MapPin, Phone, RefreshCw, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { Avatar, Button, Card } from '../components/ui';
import { ApiError } from '../services/api';
import { useAppStore } from '../store/useAppStore';

export function ProfilePage() {
  const user = useAppStore((state) => state.user)!;
  const addToast = useAppStore((state) => state.addToast);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const updateContacts = useAppStore((state) => state.updateContacts);
  const requestVerification = useAppStore((state) => state.requestVerification);
  const confirmVerification = useAppStore((state) => state.confirmVerification);
  const pendingVerification = useAppStore((state) => state.pendingVerification);
  const logout = useAppStore((state) => state.logout);

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [timezone, setTimezone] = useState(user.timezone);
  const [currentPassword, setCurrentPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<'email' | 'phone' | null>(null);
  const [emailLessons, setEmailLessons] = useState(true);
  const [emailSessions, setEmailSessions] = useState(true);
  const [emailMarketing, setEmailMarketing] = useState(false);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone);
    setTimezone(user.timezone);
  }, [user.id, user.name, user.email, user.phone, user.timezone]);

  useEffect(() => {
    if (pendingVerification?.emailCode) setEmailCode(pendingVerification.emailCode);
    if (pendingVerification?.phoneCode) setPhoneCode(pendingVerification.phoneCode);
  }, [pendingVerification?.emailCode, pendingVerification?.phoneCode]);

  const contactsChanged = useMemo(
    () => email.trim().toLowerCase() !== user.email.toLowerCase() || phone.trim() !== user.phone,
    [email, phone, user.email, user.phone]
  );

  const save = async () => {
    if (phone.replace(/\D/g, '').length < 10) {
      addToast({ title: 'Проверьте номер телефона', text: 'Номер должен содержать не менее 10 цифр.', tone: 'warning' });
      return;
    }
    if (contactsChanged && !currentPassword) {
      addToast({ title: 'Нужен текущий пароль', text: 'Он требуется для безопасного изменения Email или телефона.', tone: 'warning' });
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), email: user.email, phone: user.phone, timezone });
      if (contactsChanged) {
        const verification = await updateContacts({
          currentPassword,
          email: email.trim(),
          phone: phone.trim()
        });
        if (verification?.emailCode) setEmailCode(verification.emailCode);
        if (verification?.phoneCode) setPhoneCode(verification.phoneCode);
        setCurrentPassword('');
      }
      addToast({
        title: 'Настройки сохранены',
        text: contactsChanged ? 'Контакты обновлены. Изменённые контакты нужно подтвердить.' : 'Профиль сохранён в PostgreSQL.',
        tone: 'success'
      });
    } catch (cause) {
      addToast({ title: 'Не удалось сохранить профиль', text: cause instanceof ApiError ? cause.message : 'Ошибка backend', tone: 'warning' });
    } finally {
      setSaving(false);
    }
  };

  const sendCode = async (channel: 'email' | 'phone') => {
    setVerifying(channel);
    try {
      const code = await requestVerification(channel);
      if (channel === 'email' && code) setEmailCode(code);
      if (channel === 'phone' && code) setPhoneCode(code);
      addToast({ title: 'Код отправлен', text: channel === 'email' ? 'Проверьте Email.' : 'Проверьте SMS.', tone: 'success' });
    } catch (cause) {
      addToast({ title: 'Не удалось отправить код', text: cause instanceof ApiError ? cause.message : 'Ошибка backend', tone: 'warning' });
    } finally {
      setVerifying(null);
    }
  };

  const verify = async (channel: 'email' | 'phone') => {
    const code = channel === 'email' ? emailCode : phoneCode;
    if (code.trim().length !== 6) {
      addToast({ title: 'Введите шестизначный код', tone: 'warning' });
      return;
    }
    setVerifying(channel);
    try {
      await confirmVerification(channel, code.trim());
      addToast({ title: channel === 'email' ? 'Email подтверждён' : 'Телефон подтверждён', tone: 'success' });
      if (channel === 'email') setEmailCode('');
      else setPhoneCode('');
    } catch (cause) {
      addToast({ title: 'Код не принят', text: cause instanceof ApiError ? cause.message : 'Ошибка backend', tone: 'warning' });
    } finally {
      setVerifying(null);
    }
  };

  return (
    <AppLayout title="Профиль и настройки" subtitle="Личные данные, безопасность и уведомления.">
      <div className="profile-layout">
        <aside className="profile-nav"><button className="active"><UserRound size={18} /> Основное</button><button><Bell size={18} /> Уведомления</button><button><ShieldCheck size={18} /> Безопасность</button><button><Laptop size={18} /> Устройства</button></aside>
        <div className="profile-sections">
          <Card className="profile-card">
            <header><div><h2>Основная информация</h2><p>Профиль загружается и сохраняется через NestJS API.</p></div></header>
            <div className="avatar-settings"><div className="avatar-settings__photo"><Avatar value={user.avatar ?? 'АВ'} size="xl" /><button type="button"><Camera size={17} /></button></div><div><strong>Фотография профиля</strong><p>Загрузка аватара будет подключена вместе с S3-медиамодулем.</p><div><Button size="sm" variant="secondary" disabled>Загрузить</Button><Button size="sm" variant="ghost" disabled>Удалить</Button></div></div></div>
            <div className="profile-form-grid">
              <label><span>Имя и фамилия</span><div><UserRound size={17} /><input value={name} onChange={(event) => setName(event.target.value)} /></div></label>
              <label><span>Email <ContactBadge verified={Boolean(user.emailVerified)} /></span><div><Mail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>
              <label><span>Номер телефона <ContactBadge verified={Boolean(user.phoneVerified)} /></span><div><Phone size={17} /><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+7 999 123-45-67" /></div></label>
              <label><span>Часовой пояс</span><div><MapPin size={17} /><select value={timezone} onChange={(event) => setTimezone(event.target.value)}><option value="Europe/Moscow">Москва, Europe/Moscow</option><option value="Europe/Berlin">Берлин, Europe/Berlin</option><option value="Europe/Amsterdam">Амстердам, Europe/Amsterdam</option><option value="Asia/Dubai">Дубай, Asia/Dubai</option></select></div></label>
            </div>
            {contactsChanged ? (
              <div className="contact-password-confirm">
                <ShieldCheck size={19} />
                <div><strong>Подтвердите изменение контактов</strong><p>Email и телефон используются для входа. Введите текущий пароль.</p></div>
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Текущий пароль" autoComplete="current-password" />
              </div>
            ) : null}
            <footer><Button icon={<Save size={17} />} loading={saving} onClick={() => void save()}>Сохранить изменения</Button></footer>
          </Card>

          {(!user.emailVerified || !user.phoneVerified) ? (
            <Card className="profile-card verification-card">
              <header><div><h2>Подтверждение контактов</h2><p>В development backend может вернуть код прямо в ответе; в production он будет отправляться через Email/SMS.</p></div></header>
              <VerificationRow
                title="Email"
                value={user.email}
                verified={Boolean(user.emailVerified)}
                code={emailCode}
                setCode={setEmailCode}
                loading={verifying === 'email'}
                onSend={() => void sendCode('email')}
                onConfirm={() => void verify('email')}
              />
              <VerificationRow
                title="Телефон"
                value={user.phone}
                verified={Boolean(user.phoneVerified)}
                code={phoneCode}
                setCode={setPhoneCode}
                loading={verifying === 'phone'}
                onSend={() => void sendCode('phone')}
                onConfirm={() => void verify('phone')}
              />
            </Card>
          ) : null}

          <Card className="profile-card">
            <header><div><h2>Уведомления</h2><p>Настройки пока остаются локальными до подключения notification preferences API.</p></div></header>
            <div className="settings-list">
              <label><div><strong>Учебные напоминания</strong><span>Новые уроки, результаты тестов и слова для повторения.</span></div><input type="checkbox" checked={emailLessons} onChange={(event) => setEmailLessons(event.target.checked)} /></label>
              <label><div><strong>Занятия с преподавателем</strong><span>Напоминания, переносы и отмены встреч.</span></div><input type="checkbox" checked={emailSessions} onChange={(event) => setEmailSessions(event.target.checked)} /></label>
              <label><div><strong>Новости и специальные предложения</strong><span>Новые курсы, статьи и промокоды.</span></div><input type="checkbox" checked={emailMarketing} onChange={(event) => setEmailMarketing(event.target.checked)} /></label>
            </div>
          </Card>

          <Card className="profile-card">
            <header><div><h2>Безопасность</h2><p>Текущая сессия хранится в Redis и передаётся HttpOnly cookie.</p></div></header>
            <div className="security-actions"><div><span><KeyRound size={19} /></span><div><strong>Пароль</strong><p>Смена пароля будет вынесена в отдельную форму безопасности.</p></div><Button variant="secondary" size="sm" disabled>Изменить</Button></div><div><span><ShieldCheck size={19} /></span><div><strong>Двухфакторная аутентификация</strong><p>Следующий этап усиления auth.</p></div><Button variant="secondary" size="sm" disabled>Настроить</Button></div></div>
          </Card>

          <button className="danger-logout" onClick={() => void logout()}><LogOut size={18} /> Выйти из аккаунта</button>
        </div>
      </div>
    </AppLayout>
  );
}

function ContactBadge({ verified }: { verified: boolean }) {
  return verified ? <small className="contact-badge contact-badge--ok"><CheckCircle2 size={12} /> подтверждён</small> : <small className="contact-badge">не подтверждён</small>;
}

function VerificationRow({
  title,
  value,
  verified,
  code,
  setCode,
  loading,
  onSend,
  onConfirm
}: {
  title: string;
  value: string;
  verified: boolean;
  code: string;
  setCode: (value: string) => void;
  loading: boolean;
  onSend: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="verification-row">
      <div><strong>{title}</strong><span>{value}</span></div>
      {verified ? <span className="verification-success"><CheckCircle2 size={16} /> Подтверждён</span> : (
        <div className="verification-controls">
          <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="Код из 6 цифр" />
          <Button size="sm" variant="secondary" loading={loading} onClick={onConfirm}>Подтвердить</Button>
          <button type="button" className="verification-resend" disabled={loading} onClick={onSend}><RefreshCw size={14} /> Новый код</button>
        </div>
      )}
    </div>
  );
}
