import {
  ArrowLeft,
  Camera,
  CameraOff,
  Hand,
  Maximize,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  PhoneOff,
  Settings,
  Users,
  Volume2,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar, Button } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { formatDate } from '../utils/format';

export function VideoRoomPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const session = useAppStore((state) => state.sessions.find((item) => item.id === sessionId));
  const user = useAppStore((state) => state.user)!;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const [joined, setJoined] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [deviceError, setDeviceError] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 'm1', author: 'Наталья Орлова', text: 'Добрый вечер! Начнём через пару минут.', time: '18:57' },
    { id: 'm2', author: 'Михаил', text: 'Всем привет 👋', time: '18:58' }
  ]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    displayStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const requestMedia = async () => {
    setDeviceError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
      setMicOn(true);
    } catch {
      setDeviceError('Браузер не предоставил доступ к камере или микрофону. Можно войти без них.');
    }
  };

  const toggleCamera = async () => {
    if (!streamRef.current) {
      await requestMedia();
      return;
    }
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCameraOn(track.enabled);
    }
  };

  const toggleMic = async () => {
    if (!streamRef.current) {
      await requestMedia();
      return;
    }
    const track = streamRef.current.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  };

  const toggleScreen = async () => {
    if (screenSharing) {
      displayStreamRef.current?.getTracks().forEach((track) => track.stop());
      displayStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = streamRef.current;
      setScreenSharing(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      displayStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setScreenSharing(true);
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (videoRef.current) videoRef.current.srcObject = streamRef.current;
        setScreenSharing(false);
      });
    } catch {
      setDeviceError('Демонстрация экрана отменена или недоступна.');
    }
  };

  const leave = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    displayStreamRef.current?.getTracks().forEach((track) => track.stop());
    navigate('/app/schedule');
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    setMessages((items) => [...items, { id: String(Date.now()), author: user.name, text: message.trim(), time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }]);
    setMessage('');
  };

  if (!session) return <div className="video-not-found"><h1>Занятие не найдено</h1><Link to="/app/schedule"><Button>К расписанию</Button></Link></div>;

  if (!joined) {
    return (
      <main className="prejoin-page">
        <header><Link to="/app/schedule"><ArrowLeft size={19} /> Назад</Link><span>Проверка оборудования</span><button><Settings size={19} /></button></header>
        <div className="prejoin-grid">
          <section className="prejoin-preview">
            <div className="prejoin-video">
              <video ref={videoRef} autoPlay muted playsInline />
              {!cameraOn ? <div className="prejoin-placeholder"><Avatar value={user.avatar ?? 'АВ'} size="xl" /><span>Камера выключена</span></div> : null}
              <div className="prejoin-controls"><button className={!micOn ? 'off' : ''} onClick={toggleMic}>{micOn ? <Mic size={20} /> : <MicOff size={20} />}</button><button className={!cameraOn ? 'off' : ''} onClick={toggleCamera}>{cameraOn ? <Camera size={20} /> : <CameraOff size={20} />}</button></div>
            </div>
            {deviceError ? <p className="device-error">{deviceError}</p> : null}
            <div className="device-checks"><label><Mic size={18} /><select><option>Микрофон по умолчанию</option></select><span className="audio-level"><i /><i /><i /><i /></span></label><label><Camera size={18} /><select><option>Камера по умолчанию</option></select></label><label><Volume2 size={18} /><select><option>Динамики по умолчанию</option></select><button>Проверить</button></label></div>
          </section>
          <aside className="prejoin-info">
            <span className="eyebrow">Живое занятие</span>
            <h1>{session.title}</h1>
            <p>{formatDate(session.startAt, true)} · {session.duration} минут</p>
            <div className="prejoin-teacher"><Avatar value="НО" /><div><small>Преподаватель</small><strong>{session.instructor}</strong></div></div>
            <div className="prejoin-attendees"><Users size={18} /><span>Уже подключились: {Math.max(1, session.attendees - 2)} из {session.maxAttendees}</span></div>
            <Button size="lg" onClick={() => setJoined(true)}>Войти в занятие</Button>
            <small>Нажимая «Войти», вы соглашаетесь с правилами проведения видеозанятий.</small>
          </aside>
        </div>
      </main>
    );
  }

  const participants = [
    { name: 'Наталья Орлова', avatar: 'НО', teacher: true },
    { name: 'Михаил К.', avatar: 'МК' },
    { name: 'Дарья С.', avatar: 'ДС' },
    { name: 'Ирина П.', avatar: 'ИП' }
  ];

  return (
    <main className="video-room-page">
      <header className="video-room-header"><div><span className="live-pill">LIVE</span><strong>{session.title}</strong></div><span>00:24:18</span><button><MoreHorizontal size={20} /></button></header>
      <div className="video-room-body">
        <section className="video-stage">
          <div className="video-grid">
            <article className="participant participant--local">
              <video ref={videoRef} autoPlay muted playsInline />
              {!cameraOn && !screenSharing ? <div className="participant-placeholder"><Avatar value={user.avatar ?? 'АВ'} size="xl" /></div> : null}
              <span>{user.name} (вы)</span><i>{micOn ? <Mic size={15} /> : <MicOff size={15} />}</i>
              {screenSharing ? <b>Вы показываете экран</b> : null}
            </article>
            {participants.map((participant, index) => (
              <article className={`participant ${index === 0 ? 'participant--speaking' : ''}`} key={participant.name}>
                <div className="participant-placeholder participant-placeholder--remote"><Avatar value={participant.avatar} size="xl" /></div>
                <span>{participant.name}{participant.teacher ? ' · преподаватель' : ''}</span><i>{index === 2 ? <MicOff size={15} /> : <Mic size={15} />}</i>
                {index === 0 ? <em>говорит</em> : null}
              </article>
            ))}
          </div>
          <div className="video-room-controls">
            <button className={!micOn ? 'off' : ''} onClick={toggleMic}><span>{micOn ? <Mic size={21} /> : <MicOff size={21} />}</span><small>Микрофон</small></button>
            <button className={!cameraOn ? 'off' : ''} onClick={toggleCamera}><span>{cameraOn ? <Camera size={21} /> : <CameraOff size={21} />}</span><small>Камера</small></button>
            <button className={screenSharing ? 'active' : ''} onClick={toggleScreen}><span><MonitorUp size={21} /></span><small>Экран</small></button>
            <button className={handRaised ? 'active' : ''} onClick={() => setHandRaised((value) => !value)}><span><Hand size={21} /></span><small>Рука</small></button>
            <button className={chatOpen ? 'active' : ''} onClick={() => { setChatOpen((value) => !value); setPeopleOpen(false); }}><span><MessageCircle size={21} /></span><small>Чат</small></button>
            <button className={peopleOpen ? 'active' : ''} onClick={() => { setPeopleOpen((value) => !value); setChatOpen(false); }}><span><Users size={21} /></span><small>Участники</small></button>
            <button><span><Maximize size={21} /></span><small>На весь экран</small></button>
            <button className="leave-call" onClick={leave}><span><PhoneOff size={21} /></span><small>Выйти</small></button>
          </div>
        </section>
        {chatOpen ? (
          <aside className="video-sidepanel">
            <header><strong>Чат занятия</strong><button onClick={() => setChatOpen(false)}><X size={19} /></button></header>
            <div className="chat-messages">{messages.map((item) => <article key={item.id}><div><strong>{item.author}</strong><small>{item.time}</small></div><p>{item.text}</p></article>)}</div>
            <div className="chat-input"><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Сообщение" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} /><button onClick={sendMessage}>➤</button></div>
          </aside>
        ) : peopleOpen ? (
          <aside className="video-sidepanel people-panel"><header><strong>Участники · {participants.length + 1}</strong><button onClick={() => setPeopleOpen(false)}><X size={19} /></button></header><div>{[{ name: user.name, avatar: user.avatar ?? 'АВ' }, ...participants].map((person) => <article key={person.name}><Avatar value={person.avatar} size="sm" /><span>{person.name}</span><Mic size={15} /></article>)}</div></aside>
        ) : null}
      </div>
    </main>
  );
}
