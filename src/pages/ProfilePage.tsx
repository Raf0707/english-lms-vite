import { Bell, Camera, KeyRound, Laptop, LogOut, Mail, MapPin, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { Avatar, Button, Card } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

export function ProfilePage() {
  const user = useAppStore((state) => state.user)!;
  const addToast = useAppStore((state) => state.addToast);
  const logout = useAppStore((state) => state.logout);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [timezone, setTimezone] = useState(user.timezone);
  const [emailLessons, setEmailLessons] = useState(true);
  const [emailSessions, setEmailSessions] = useState(true);
  const [emailMarketing, setEmailMarketing] = useState(false);

  const save = () => addToast({ title: 'Настройки сохранены', text: 'Изменения профиля применены в демо-режиме.', tone: 'success' });

  return (
    <AppLayout title="Профиль и настройки" subtitle="Личные данные, безопасность и уведомления.">
      <div className="profile-layout">
        <aside className="profile-nav"><button className="active"><UserRound size={18} /> Основное</button><button><Bell size={18} /> Уведомления</button><button><ShieldCheck size={18} /> Безопасность</button><button><Laptop size={18} /> Устройства</button></aside>
        <div className="profile-sections">
          <Card className="profile-card">
            <header><div><h2>Основная информация</h2><p>Используется в сертификатах и на занятиях.</p></div></header>
            <div className="avatar-settings"><div className="avatar-settings__photo"><Avatar value={user.avatar ?? 'АВ'} size="xl" /><button><Camera size={17} /></button></div><div><strong>Фотография профиля</strong><p>JPG, PNG или WebP до 5 МБ.</p><div><Button size="sm" variant="secondary">Загрузить</Button><Button size="sm" variant="ghost">Удалить</Button></div></div></div>
            <div className="profile-form-grid"><label><span>Имя и фамилия</span><div><UserRound size={17} /><input value={name} onChange={(event) => setName(event.target.value)} /></div></label><label><span>Email</span><div><Mail size={17} /><input value={email} onChange={(event) => setEmail(event.target.value)} /></div></label><label className="full"><span>Часовой пояс</span><div><MapPin size={17} /><select value={timezone} onChange={(event) => setTimezone(event.target.value)}><option value="Europe/Moscow">Москва, UTC+3</option><option value="Europe/Amsterdam">Амстердам, UTC+2</option><option value="Asia/Dubai">Дубай, UTC+4</option></select></div></label></div>
            <footer><Button icon={<Save size={17} />} onClick={save}>Сохранить изменения</Button></footer>
          </Card>

          <Card className="profile-card">
            <header><div><h2>Уведомления</h2><p>Выберите, какие письма хотите получать.</p></div></header>
            <div className="settings-list">
              <label><div><strong>Учебные напоминания</strong><span>Новые уроки, результаты тестов и слова для повторения.</span></div><input type="checkbox" checked={emailLessons} onChange={(event) => setEmailLessons(event.target.checked)} /></label>
              <label><div><strong>Занятия с преподавателем</strong><span>Напоминания, переносы и отмены встреч.</span></div><input type="checkbox" checked={emailSessions} onChange={(event) => setEmailSessions(event.target.checked)} /></label>
              <label><div><strong>Новости и специальные предложения</strong><span>Новые курсы, статьи и промокоды.</span></div><input type="checkbox" checked={emailMarketing} onChange={(event) => setEmailMarketing(event.target.checked)} /></label>
            </div>
          </Card>

          <Card className="profile-card">
            <header><div><h2>Безопасность</h2><p>Управление паролем и активными сеансами.</p></div></header>
            <div className="security-actions"><div><span><KeyRound size={19} /></span><div><strong>Пароль</strong><p>Последнее изменение 28 июля 2026</p></div><Button variant="secondary" size="sm">Изменить</Button></div><div><span><ShieldCheck size={19} /></span><div><strong>Двухфакторная аутентификация</strong><p>Дополнительная защита аккаунта</p></div><Button variant="secondary" size="sm">Настроить</Button></div></div>
          </Card>

          <button className="danger-logout" onClick={logout}><LogOut size={18} /> Выйти из аккаунта</button>
        </div>
      </div>
    </AppLayout>
  );
}
