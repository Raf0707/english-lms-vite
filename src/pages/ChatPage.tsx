import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flag, Headphones, MessageCircle, Paperclip, Plus, RefreshCw, Search, Send, Users, Wifi, WifiOff, X } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { LearningMaterialItem } from '../components/LearningMaterialItem';
import { MaterialViewerDialog } from '../components/MaterialViewerDialog';
import { Avatar, Badge, Button, Card } from '../components/ui';
import { api, type BackendChatMessage, type BackendChatUser, type BackendConversation, type BackendLearningMaterial } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { attachmentAcceptForRole, validateAttachmentForRole } from '../utils/fileUploadPolicy';

function displayName(user?: BackendChatUser | null) {
  if (!user) return 'Система';
  return user.profile?.displayName?.trim() || [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') || user.email;
}
function initials(user?: BackendChatUser | null) {
  return displayName(user).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'CH';
}
function otherParticipant(conversation: BackendConversation, me: string) {
  return conversation.participants.find((item) => item.userId !== me)?.user;
}
function isAdminUser(user?: BackendChatUser | null) {
  return Boolean(user?.roles?.some((entry) => entry.role.code === 'ADMIN'));
}
function supportRequester(conversation: BackendConversation) {
  return conversation.participants.find((item) => item.userId === conversation.createdById)?.user
    ?? conversation.participants.find((item) => !isAdminUser(item.user))?.user;
}
function chatRoleLabel(user?: BackendChatUser | null) {
  if (user?.roles?.some((entry) => entry.role.code === 'TEACHER')) return 'Преподаватель';
  if (user?.roles?.some((entry) => entry.role.code === 'ADMIN')) return 'Администратор';
  return 'Ученик';
}
function formatChatTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return new Intl.DateTimeFormat('ru-RU', sameDay ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}
function fileKind(file: File) {
  if (file.type.startsWith('image/')) return 'IMAGE' as const;
  if (file.type.startsWith('video/')) return 'VIDEO' as const;
  if (file.type.startsWith('audio/')) return 'AUDIO' as const;
  return 'DOCUMENT' as const;
}

export function ChatPage() {
  const user = useAppStore((state) => state.user)!;
  const addToast = useAppStore((state) => state.addToast);
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState<BackendConversation[]>([]);
  const [contacts, setContacts] = useState<BackendChatUser[]>([]);
  const [messages, setMessages] = useState<BackendChatMessage[]>([]);
  const [selectedId, setSelectedId] = useState(params.get('conversation') ?? '');
  const activeTab = params.get('tab') === 'support' || params.get('support') === '1' ? 'support' : 'chats';
  const [query, setQuery] = useState('');
  const [text, setText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [viewerMaterial, setViewerMaterial] = useState<BackendLearningMaterial | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async () => {
    const rows = await api.chat.conversations();
    setConversations(rows);
    return rows;
  }, []);

  const selectConversation = useCallback(async (id: string, tab: 'chats' | 'support' = 'chats') => {
    setSelectedId(id);
    setPendingFiles([]);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set('conversation', id);
      next.set('tab', tab);
      next.delete('support');
      return next;
    }, { replace: true });
    const rows = await api.chat.messages(id);
    setMessages(rows);
    await api.chat.read(id).catch(() => undefined);
    setConversations((current) => current.map((item) => item.id === id ? { ...item, unreadCount: 0 } : item));
  }, [setParams]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([api.chat.conversations(), api.chat.contacts()]).then(async ([rows, people]) => {
      if (!alive) return;
      setConversations(rows);
      setContacts(people);
      const requested = params.get('conversation');
      if (params.get('support') === '1' || params.get('tab') === 'support') {
        if (user.role === 'admin') {
          const support = rows.find((item) => item.type === 'SUPPORT');
          if (support) await selectConversation(support.id, 'support');
        } else {
          const support = await api.chat.support();
          if (alive) { await loadConversations(); await selectConversation(support.id, 'support'); }
        }
      } else if (requested && rows.some((item) => item.id === requested)) {
        const requestedConversation = rows.find((item) => item.id === requested)!;
        await selectConversation(requested, requestedConversation.type === 'SUPPORT' ? 'support' : 'chats');
      } else {
        const firstChat = rows.find((item) => item.type !== 'SUPPORT') ?? rows[0];
        if (firstChat) await selectConversation(firstChat.id, firstChat.type === 'SUPPORT' ? 'support' : 'chats');
      }
    }).catch((error) => addToast({ title: 'Не удалось загрузить чаты', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' })).finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const raw = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');
    const socket = io(`${raw}/chat`, { withCredentials: true, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('message:new', (message: BackendChatMessage) => {
      if (message.conversationId === selectedId) {
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        void api.chat.read(message.conversationId).catch(() => undefined);
      }
      void loadConversations();
    });
    socket.on('conversation:new', () => { void loadConversations(); });
    socket.on('conversation:updated', () => { void loadConversations(); });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [loadConversations, selectedId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const selected = conversations.find((item) => item.id === selectedId);
  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((item) => {
      const inTab = activeTab === 'support' ? item.type === 'SUPPORT' : item.type !== 'SUPPORT';
      if (!inTab) return false;
      if (!q) return true;
      const other = item.type === 'SUPPORT' && user.role === 'admin' ? supportRequester(item) : otherParticipant(item, user.id);
      const last = item.messages?.[0]?.body ?? '';
      return `${displayName(other)} ${other?.email ?? ''} ${last}`.toLowerCase().includes(q);
    });
  }, [activeTab, conversations, query, user.id]);
  const filteredContacts = useMemo(() => {
    const existingIds = new Set(conversations.flatMap((item) => item.participants.map((part) => part.userId)));
    return contacts.filter((item) => item.id !== user.id && !existingIds.has(item.id)).slice(0, 12);
  }, [contacts, conversations, user.id]);

  const startDirect = async (contact: BackendChatUser) => {
    try { const conversation = await api.chat.direct(contact.id); await loadConversations(); await selectConversation(conversation.id, 'chats'); }
    catch (error) { addToast({ title: 'Диалог недоступен', text: error instanceof Error ? error.message : 'Нет учебной связи для чата', tone: 'warning' }); }
  };
  const startSupport = async () => {
    try { const conversation = await api.chat.support(); await loadConversations(); await selectConversation(conversation.id, 'support'); }
    catch (error) { addToast({ title: 'Поддержка недоступна', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' }); }
  };

  const switchTab = async (tab: 'chats' | 'support') => {
    setQuery('');
    const target = conversations.find((item) => tab === 'support' ? item.type === 'SUPPORT' : item.type !== 'SUPPORT');
    if (target) {
      await selectConversation(target.id, tab);
      return;
    }
    if (tab === 'support' && user.role !== 'admin') {
      await startSupport();
      return;
    }
    setSelectedId('');
    setMessages([]);
    setParams({ tab }, { replace: true });
  };

  useEffect(() => {
    if (loading) return;
    const current = conversations.find((item) => item.id === selectedId);
    const currentMatchesTab = current ? (activeTab === 'support' ? current.type === 'SUPPORT' : current.type !== 'SUPPORT') : false;
    if (!currentMatchesTab) void switchTab(activeTab);
    // URL tab can be changed from the persistent sidebar while ChatPage remains mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loading]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      const error = validateAttachmentForRole(file, user.role);
      if (error) {
        addToast({ title: 'Файл запрещён', text: `${file.name}: ${error}`, tone: 'warning' });
        continue;
      }
      accepted.push(file);
    }
    setPendingFiles((current) => [...current, ...accepted].slice(0, 10));
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const body = text.trim();
    if (!selectedId || (!body && !pendingFiles.length) || sending) return;
    const files = pendingFiles;
    setSending(true);
    try {
      const assets = [];
      for (const file of files) assets.push(await api.media.upload(file, fileKind(file)));
      const message = await api.chat.send(selectedId, body, assets.map((item) => item.assetId));
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      setText('');
      setPendingFiles([]);
      await loadConversations();
    } catch (error) {
      addToast({ title: 'Сообщение не отправлено', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally { setSending(false); }
  };

  const report = async (message: BackendChatMessage) => {
    const reason = window.prompt('Почему вы хотите пожаловаться на это сообщение?');
    if (!reason?.trim()) return;
    try {
      await api.chat.report(message.id, reason.trim());
      addToast({ title: 'Жалоба отправлена', text: 'Администратор получит служебное уведомление. Просмотр переписки возможен только в рамках этой жалобы.', tone: 'success' });
    } catch (error) { addToast({ title: 'Не удалось отправить жалобу', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' }); }
  };

  return <AppLayout title="Чаты и поддержка" subtitle="Учебные диалоги, обращения в поддержку и постоянные вложения. Файлы автоматически попадают во внутреннее хранилище материалов.">
    <div className="chat-layout">
      <Card className="chat-sidebar-card">
        <div className="chat-sidebar-head"><div><strong>{activeTab === 'support' ? 'Поддержка' : 'Диалоги'}</strong><small className={connected ? 'chat-online' : 'chat-offline'}>{connected ? <Wifi size={13}/> : <WifiOff size={13}/>} {connected ? 'онлайн' : 'переподключение'}</small></div><button className="icon-button" onClick={() => void loadConversations()} title="Обновить"><RefreshCw size={17}/></button></div>
        <div className="chat-mode-tabs"><button className={activeTab === 'chats' ? 'active' : ''} onClick={() => void switchTab('chats')}><MessageCircle size={15}/> Чаты</button><button className={activeTab === 'support' ? 'active' : ''} onClick={() => void switchTab('support')}><Headphones size={15}/> Поддержка</button></div>
        <label className="chat-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск диалогов"/></label>
        <div className="chat-conversation-list">
          {loading ? <p className="chat-placeholder">Загружаем диалоги…</p> : null}
          {!loading && filteredConversations.length === 0 ? <p className="chat-placeholder">Диалогов пока нет.</p> : null}
          {filteredConversations.map((conversation) => {
            const other = conversation.type === 'SUPPORT' && user.role === 'admin' ? supportRequester(conversation) : otherParticipant(conversation, user.id);
            const last = conversation.messages?.[0];
            const supportAdmin = conversation.type === 'SUPPORT' && user.role === 'admin';
            return <button key={conversation.id} className={conversation.id === selectedId ? 'active' : ''} onClick={() => void selectConversation(conversation.id, conversation.type === 'SUPPORT' ? 'support' : 'chats')}><Avatar value={supportAdmin ? initials(other) : conversation.type === 'SUPPORT' ? 'SP' : initials(other)} size="sm"/><span><strong>{supportAdmin ? displayName(other) : conversation.type === 'SUPPORT' ? 'Поддержка' : displayName(other)}</strong><small>{supportAdmin ? `${chatRoleLabel(other)} · ${other?.email ?? 'без email'}${last?.body ? ` · ${last.body}` : ''}` : last?.body || (last?.attachments?.length ? 'Вложение' : 'Диалог создан')}</small></span>{conversation.unreadCount ? <b>{conversation.unreadCount}</b> : null}</button>;
          })}
        </div>
        {activeTab === 'chats' ? <div className="chat-new-section"><small>Новый диалог</small>{user.role !== 'admin' ? <Button size="sm" variant="secondary" icon={<Headphones size={15}/>} onClick={() => void startSupport()}>Поддержка</Button> : null}{filteredContacts.map((contact) => <button key={contact.id} className="chat-contact" onClick={() => void startDirect(contact)}><Avatar value={initials(contact)} size="sm"/><span><strong>{displayName(contact)}</strong><small>{contact.roles?.some((entry) => entry.role.code === 'TEACHER') ? 'Преподаватель' : contact.roles?.some((entry) => entry.role.code === 'ADMIN') ? 'Администратор' : 'Ученик'}</small></span><Plus size={15}/></button>)}</div> : activeTab === 'support' && user.role !== 'admin' && filteredConversations.length === 0 ? <div className="chat-new-section"><small>Служба поддержки</small><Button size="sm" variant="secondary" icon={<Headphones size={15}/>} onClick={() => void startSupport()}>Открыть обращение</Button></div> : null}
      </Card>

      <Card className="chat-main-card">
        {selected ? <>
          <header className="chat-thread-head">{selected.type === 'SUPPORT' ? user.role === 'admin' ? (() => { const requester = supportRequester(selected); return <><Avatar value={initials(requester)}/><div><strong>{displayName(requester)}</strong><span>{chatRoleLabel(requester)} · {requester?.email ?? 'без email'} · обращение в поддержку</span></div></>; })() : <><Avatar value="SP"/><div><strong>Служба поддержки</strong><span>Обращение внутри платформы</span></div></> : (() => { const other = otherParticipant(selected, user.id); return <><Avatar value={initials(other)}/><div><strong>{displayName(other)}</strong><span>Учебный диалог</span></div></>; })()}<Badge tone={connected ? 'green' : 'neutral'}>{connected ? 'Realtime' : 'REST'}</Badge></header>
          <div className="chat-messages-panel">
            {messages.map((message) => {
              const own = message.authorId === user.id;
              const system = message.kind === 'SYSTEM';
              if (system) return <div key={message.id} className="chat-system-message"><MessageCircle size={14}/>{message.body}</div>;
              return <article key={message.id} className={own ? 'own' : ''}><div className="chat-bubble">{message.body ? <p>{message.body}</p> : null}{message.attachments?.length ? <div className="chat-attachments">{message.attachments.map((attachment) => <LearningMaterialItem key={attachment.id} material={attachment.material} compact allowSave onOpen={setViewerMaterial}/>)}</div> : null}<footer><span>{formatChatTime(message.createdAt)}</span>{!own ? <button onClick={() => void report(message)} title="Пожаловаться"><Flag size={13}/></button> : null}</footer></div></article>;
            })}
            <div ref={messagesEndRef}/>
          </div>
          <form className="chat-composer" onSubmit={send}>
            {pendingFiles.length ? <div className="chat-pending-files">{pendingFiles.map((file, index) => <span key={`${file.name}-${index}`}><Paperclip size={13}/>{file.name}<button type="button" onClick={() => setPendingFiles((current) => current.filter((_, i) => i !== index))}><X size={13}/></button></span>)}</div> : null}
            <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={4000} placeholder="Напишите сообщение…" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}/>
            <div><div className="chat-composer-tools"><input ref={fileInputRef} hidden type="file" multiple accept={attachmentAcceptForRole(user.role)} onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ''; }}/><Button type="button" variant="ghost" size="sm" icon={<Paperclip size={16}/>} onClick={() => fileInputRef.current?.click()}>Файл</Button><small>{text.length}/4000 · до 10 файлов</small></div><Button type="submit" icon={<Send size={16}/>} disabled={(!text.trim() && !pendingFiles.length) || sending}>{sending ? 'Загружаем…' : 'Отправить'}</Button></div>
          </form>
        </> : <div className="chat-empty-state"><Users size={42}/><h2>Выберите диалог</h2><p>Для ученика доступны преподаватели, с которыми есть курс или занятие. Для связи с администрацией используйте поддержку.</p>{user.role !== 'admin' ? <Button icon={<Headphones size={16}/>} onClick={() => void startSupport()}>Написать в поддержку</Button> : null}</div>}
      </Card>
    </div>
    <MaterialViewerDialog material={viewerMaterial} onClose={() => setViewerMaterial(null)}/>
  </AppLayout>;
}
