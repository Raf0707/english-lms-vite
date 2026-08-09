import {
  ArrowLeft,
  Camera,
  CameraOff,
  Download,
  FileUp,
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
import { Room, RoomEvent, Track, type Participant } from 'livekit-client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LearningMaterialItem } from '../components/LearningMaterialItem';
import { MaterialViewerDialog } from '../components/MaterialViewerDialog';
import { Avatar, Button } from '../components/ui';
import { api, type BackendLearningMaterial } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { formatDate } from '../utils/format';
import { attachmentAcceptForRole, validateAttachmentForRole } from '../utils/fileUploadPolicy';

type CallMessage = { id: string; author: string; authorId: string; text: string; time: string; material?: BackendLearningMaterial };

type ParticipantTileProps = {
  participant: Participant;
  local: boolean;
  version: number;
  speaking: boolean;
};

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'УЧ';
}

function ParticipantTile({ participant, local, version, speaking }: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare);
  const cameraPublication = participant.getTrackPublication(Track.Source.Camera);
  const videoPublication = screenPublication?.track ? screenPublication : cameraPublication;
  const microphonePublication = participant.getTrackPublication(Track.Source.Microphone);
  const hasVideo = Boolean(videoPublication?.track && !videoPublication.isMuted);
  const handRaised = participant.attributes.handRaised === 'true';
  const name = participant.name || participant.identity;

  useEffect(() => {
    const videoTrack = videoPublication?.track;
    const audioTrack = local ? undefined : microphonePublication?.track;
    const video = videoRef.current;
    const audio = audioRef.current;
    if (videoTrack && video) videoTrack.attach(video);
    if (audioTrack && audio) audioTrack.attach(audio);
    return () => {
      if (videoTrack && video) videoTrack.detach(video);
      if (audioTrack && audio) audioTrack.detach(audio);
    };
  }, [local, microphonePublication?.track, version, videoPublication?.track]);

  return <article className={`participant ${local ? 'participant--local' : ''} ${speaking ? 'participant--speaking' : ''}`}>
    <video ref={videoRef} autoPlay muted={local} playsInline className={screenPublication?.track ? 'participant-screen-video' : ''}/>
    {!hasVideo ? <div className="participant-placeholder"><Avatar value={initials(name)} size="xl" /></div> : null}
    {!local ? <audio ref={audioRef} autoPlay playsInline /> : null}
    <span>{name}{local ? ' (вы)' : ''}</span>
    <i>{participant.isMicrophoneEnabled ? <Mic size={15}/> : <MicOff size={15}/>}</i>
    {speaking ? <em>говорит</em> : null}
    {handRaised ? <b className="participant-hand"><Hand size={14}/> поднята рука</b> : null}
    {screenPublication?.track ? <b className="participant-sharing">Демонстрация экрана</b> : null}
  </article>;
}

function fileKind(file: File) {
  if (file.type.startsWith('image/')) return 'IMAGE' as const;
  if (file.type.startsWith('video/')) return 'VIDEO' as const;
  if (file.type.startsWith('audio/')) return 'AUDIO' as const;
  return 'DOCUMENT' as const;
}

function browserLiveKitUrl(value: string) {
  try {
    const url = new URL(value);
    if (['livekit', 'localhost', '127.0.0.1'].includes(url.hostname) && window.location.hostname) url.hostname = window.location.hostname;
    return url.toString().replace(/\/$/, '');
  } catch {
    return value;
  }
}

export function VideoRoomPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const session = useAppStore((state) => state.sessions.find((item) => item.id === sessionId));
  const user = useAppStore((state) => state.user)!;
  const addToast = useAppStore((state) => state.addToast);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const roomRef = useRef<Room | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [roomVersion, setRoomVersion] = useState(0);
  const [activeSpeakers, setActiveSpeakers] = useState<Set<string>>(new Set());
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [deviceError, setDeviceError] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<CallMessage[]>([]);
  const [materials, setMaterials] = useState<BackendLearningMaterial[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewerMaterial, setViewerMaterial] = useState<BackendLearningMaterial | null>(null);

  const refreshRoom = useCallback(() => setRoomVersion((value) => value + 1), []);
  const loadMaterials = useCallback(async () => {
    if (!sessionId) return;
    try { setMaterials(await api.materials.event(sessionId)); }
    catch { /* access may not be established until booking/course bootstrap is complete */ }
  }, [sessionId]);

  useEffect(() => () => {
    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
    roomRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (!joined) return;
    void loadMaterials();
    const timer = window.setInterval(() => void loadMaterials(), 10000);
    return () => window.clearInterval(timer);
  }, [joined, loadMaterials]);

  const requestMedia = async () => {
    setDeviceError('');
    try {
      previewStreamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      previewStreamRef.current = stream;
      if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;
      setCameraOn(true);
      setMicOn(true);
    } catch {
      setDeviceError('Браузер не предоставил доступ к камере или микрофону. Можно войти без них и включить устройства позже.');
    }
  };

  const toggleCamera = async () => {
    const liveRoom = roomRef.current;
    if (joined && liveRoom) {
      const next = !liveRoom.localParticipant.isCameraEnabled;
      try { await liveRoom.localParticipant.setCameraEnabled(next); setCameraOn(next); refreshRoom(); }
      catch { setDeviceError('Не удалось переключить камеру. Проверьте разрешение браузера и занятость устройства.'); }
      return;
    }
    if (!previewStreamRef.current) { await requestMedia(); return; }
    const track = previewStreamRef.current.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCameraOn(track.enabled); }
  };

  const toggleMic = async () => {
    const liveRoom = roomRef.current;
    if (joined && liveRoom) {
      const next = !liveRoom.localParticipant.isMicrophoneEnabled;
      try { await liveRoom.localParticipant.setMicrophoneEnabled(next); setMicOn(next); refreshRoom(); }
      catch { setDeviceError('Не удалось переключить микрофон. Проверьте разрешение браузера.'); }
      return;
    }
    if (!previewStreamRef.current) { await requestMedia(); return; }
    const track = previewStreamRef.current.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
  };

  const toggleScreen = async () => {
    const liveRoom = roomRef.current;
    if (!joined || !liveRoom) return;
    const next = !liveRoom.localParticipant.isScreenShareEnabled;
    try { await liveRoom.localParticipant.setScreenShareEnabled(next); setScreenSharing(next); refreshRoom(); }
    catch { setDeviceError('Демонстрация экрана отменена или недоступна.'); }
  };

  const toggleHand = async () => {
    const liveRoom = roomRef.current;
    if (!liveRoom) return;
    const next = !handRaised;
    try {
      await liveRoom.localParticipant.setAttributes({ handRaised: next ? 'true' : 'false' });
      setHandRaised(next);
      refreshRoom();
    } catch {
      addToast({ title: 'Не удалось изменить статус руки', text: 'LiveKit не разрешил обновление атрибутов участника.', tone: 'warning' });
    }
  };

  const join = async () => {
    if (!sessionId || joining) return;
    setJoining(true);
    setDeviceError('');
    try {
      const health = await api.video.health().catch(() => null);
      if (health && !health.reachable) throw new Error(`LiveKit недоступен по ${health.url}. Запустите docker-compose.video.yml и проверьте порт 7880.`);
      const ticket = await api.video.token(sessionId);
      const signalUrl = browserLiveKitUrl(ticket.url);
      const nextRoom = new Room({ adaptiveStream: true, dynacast: true });
      const update = () => refreshRoom();
      nextRoom.on(RoomEvent.ParticipantConnected, update);
      nextRoom.on(RoomEvent.ParticipantDisconnected, update);
      nextRoom.on(RoomEvent.TrackSubscribed, update);
      nextRoom.on(RoomEvent.TrackUnsubscribed, update);
      nextRoom.on(RoomEvent.TrackMuted, update);
      nextRoom.on(RoomEvent.TrackUnmuted, update);
      nextRoom.on(RoomEvent.LocalTrackPublished, update);
      nextRoom.on(RoomEvent.LocalTrackUnpublished, update);
      nextRoom.on(RoomEvent.ParticipantAttributesChanged, update);
      nextRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => setActiveSpeakers(new Set(speakers.map((item) => item.identity))));
      nextRoom.on(RoomEvent.DataReceived, (payload) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload)) as { type?: string; message?: CallMessage };
          if ((data.type === 'chat' || data.type === 'material-message') && data.message) setMessages((current) => current.some((item) => item.id === data.message!.id) ? current : [...current, data.message!]);
          if (data.type === 'material' || data.type === 'material-message') void loadMaterials();
        } catch { /* ignore non-LMS data packets */ }
      });
      nextRoom.on(RoomEvent.Disconnected, () => { setJoined(false); setRoom(null); roomRef.current = null; });

      await nextRoom.connect(signalUrl, ticket.token);
      previewStreamRef.current?.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = null;
      if (cameraOn) await nextRoom.localParticipant.setCameraEnabled(true);
      if (micOn) await nextRoom.localParticipant.setMicrophoneEnabled(true);
      await nextRoom.localParticipant.setAttributes({ handRaised: 'false' });
      await nextRoom.startAudio().catch(() => undefined);
      roomRef.current = nextRoom;
      setRoom(nextRoom);
      setJoined(true);
      setCameraOn(nextRoom.localParticipant.isCameraEnabled);
      setMicOn(nextRoom.localParticipant.isMicrophoneEnabled);
      setHandRaised(false);
      refreshRoom();
    } catch (error) {
      setDeviceError(error instanceof Error ? `Не удалось подключиться к видеокомнате: ${error.message}${/Failed to fetch/i.test(error.message) ? ' · Проверьте, что контейнер LiveKit запущен и порт 7880 открыт.' : ''}` : 'Не удалось подключиться к видеокомнате.');
    } finally { setJoining(false); }
  };

  const leave = () => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
    navigate(user.role === 'teacher' ? '/teacher?tab=sessions' : '/app/schedule');
  };

  const sendMessage = async () => {
    const liveRoom = roomRef.current;
    const body = message.trim();
    if (!body || !liveRoom) return;
    const item: CallMessage = { id: crypto.randomUUID(), author: user.name, authorId: user.id, text: body, time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) };
    setMessages((current) => [...current, item]);
    setMessage('');
    try { await liveRoom.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'chat', message: item })), { reliable: true }); }
    catch { addToast({ title: 'Сообщение не доставлено', text: 'Realtime-канал LiveKit недоступен.', tone: 'warning' }); }
  };

  const uploadMaterials = async (files: FileList | null) => {
    if (!files || !sessionId) return;
    const selected = Array.from(files).slice(0, 10).filter((file) => {
      const error = validateAttachmentForRole(file, user.role);
      if (!error) return true;
      addToast({ title: 'Файл запрещён', text: `${file.name}: ${error}`, tone: 'warning' });
      return false;
    });
    if (!selected.length) return;
    setUploading(true);
    try {
      const added: BackendLearningMaterial[] = [];
      for (const file of selected) {
        const asset = await api.media.upload(file, fileKind(file));
        added.push(await api.materials.attachEvent(sessionId, asset.assetId, file.name));
      }
      await loadMaterials();
      const liveRoom = roomRef.current;
      for (const material of added) {
        const item: CallMessage = { id: crypto.randomUUID(), author: user.name, authorId: user.id, text: 'Добавлен учебный материал', time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), material };
        setMessages((current) => [...current, item]);
        if (liveRoom) await liveRoom.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'material-message', message: item })), { reliable: true }).catch(() => undefined);
      }
      if (liveRoom) await liveRoom.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'material' })), { reliable: true }).catch(() => undefined);
      addToast({ title: selected.length === 1 ? 'Материал добавлен' : 'Материалы добавлены', text: 'Файлы сохранены во внутреннем хранилище и останутся доступны после занятия.', tone: 'success' });
    } catch (error) {
      addToast({ title: 'Не удалось загрузить материал', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally { setUploading(false); }
  };

  const openFullscreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  };

  const participants = useMemo(() => room ? [room.localParticipant, ...Array.from(room.remoteParticipants.values())] : [], [room, roomVersion]);

  if (!session) return <div className="video-not-found"><h1>Занятие не найдено</h1><Link to="/app/schedule"><Button>К расписанию</Button></Link></div>;

  if (!joined) {
    return <main className="prejoin-page">
      <header><Link to={user.role === 'teacher' ? '/teacher?tab=sessions' : '/app/schedule'}><ArrowLeft size={19}/> Назад</Link><span>Проверка оборудования</span><button><Settings size={19}/></button></header>
      <div className="prejoin-grid">
        <section className="prejoin-preview">
          <div className="prejoin-video">
            <video ref={previewVideoRef} autoPlay muted playsInline/>
            {!cameraOn ? <div className="prejoin-placeholder"><Avatar value={user.avatar ?? initials(user.name)} size="xl"/><span>Камера выключена</span></div> : null}
            <div className="prejoin-controls"><button className={!micOn ? 'off' : ''} onClick={() => void toggleMic()}>{micOn ? <Mic size={20}/> : <MicOff size={20}/>}</button><button className={!cameraOn ? 'off' : ''} onClick={() => void toggleCamera()}>{cameraOn ? <Camera size={20}/> : <CameraOff size={20}/>}</button></div>
          </div>
          {deviceError ? <p className="device-error">{deviceError}</p> : null}
          <div className="device-checks"><label><Mic size={18}/><select><option>Микрофон по умолчанию</option></select><span className="audio-level"><i/><i/><i/><i/></span></label><label><Camera size={18}/><select><option>Камера по умолчанию</option></select></label><label><Volume2 size={18}/><select><option>Динамики по умолчанию</option></select><button onClick={() => void requestMedia()}>Проверить</button></label></div>
        </section>
        <aside className="prejoin-info">
          <span className="eyebrow">Живое занятие</span><h1>{session.title}</h1><p>{formatDate(session.startAt, true)} · {session.duration} минут</p>
          <div className="prejoin-teacher"><Avatar value={initials(session.instructor)}/><div><small>Преподаватель</small><strong>{session.instructor}</strong></div></div>
          <div className="prejoin-attendees"><Users size={18}/><span>Участники подключатся в общую LiveKit-комнату</span></div>
          <Button size="lg" onClick={() => void join()} disabled={joining}>{joining ? 'Подключаемся…' : 'Войти в занятие'}</Button>
          <small>Камера и микрофон после входа публикуются через LiveKit, а не остаются только локальным предпросмотром.</small>
        </aside>
      </div>
    </main>;
  }

  return <main className="video-room-page">
    <header className="video-room-header"><div><span className="live-pill">LIVE</span><strong>{session.title}</strong></div><span>{participants.length} участн.</span><button><MoreHorizontal size={20}/></button></header>
    <div className="video-room-body">
      <section className="video-stage">
        {deviceError ? <div className="video-device-banner">{deviceError}</div> : null}
        <div className="video-grid">{participants.map((participant) => <ParticipantTile key={participant.identity} participant={participant} local={participant.identity === room?.localParticipant.identity} version={roomVersion} speaking={activeSpeakers.has(participant.identity)}/>)}</div>
        <div className="video-room-controls">
          <button className={!micOn ? 'off' : ''} onClick={() => void toggleMic()}><span>{micOn ? <Mic size={21}/> : <MicOff size={21}/>}</span><small>Микрофон</small></button>
          <button className={!cameraOn ? 'off' : ''} onClick={() => void toggleCamera()}><span>{cameraOn ? <Camera size={21}/> : <CameraOff size={21}/>}</span><small>Камера</small></button>
          <button className={screenSharing ? 'active' : ''} onClick={() => void toggleScreen()}><span><MonitorUp size={21}/></span><small>Экран</small></button>
          <button className={handRaised ? 'active' : ''} onClick={() => void toggleHand()}><span><Hand size={21}/></span><small>{handRaised ? 'Опустить' : 'Рука'}</small></button>
          <button className={chatOpen ? 'active' : ''} onClick={() => { setChatOpen((value) => !value); setPeopleOpen(false); setMaterialsOpen(false); }}><span><MessageCircle size={21}/></span><small>Чат</small></button>
          <button className={peopleOpen ? 'active' : ''} onClick={() => { setPeopleOpen((value) => !value); setChatOpen(false); setMaterialsOpen(false); }}><span><Users size={21}/></span><small>Участники</small></button>
          <button className={materialsOpen ? 'active' : ''} onClick={() => { setMaterialsOpen((value) => !value); setPeopleOpen(false); setChatOpen(false); }}><span><FileUp size={21}/></span><small>Материалы</small></button>
          <button onClick={() => void openFullscreen()}><span><Maximize size={21}/></span><small>На весь экран</small></button>
          <button className="leave-call" onClick={leave}><span><PhoneOff size={21}/></span><small>Выйти</small></button>
        </div>
      </section>

      {chatOpen ? <aside className="video-sidepanel">
        <header><strong>Чат занятия</strong><button onClick={() => setChatOpen(false)}><X size={19}/></button></header>
        <div className="chat-messages">{messages.length ? messages.map((item) => <article key={item.id}><div><strong>{item.author}</strong><small>{item.time}</small></div>{item.text ? <p>{item.text}</p> : null}{item.material ? <LearningMaterialItem material={item.material} compact allowSave onOpen={setViewerMaterial}/> : null}</article>) : <p className="video-panel-empty">Сообщений пока нет.</p>}</div>
        <div className="video-call-attachments"><input ref={fileInputRef} hidden type="file" multiple accept={attachmentAcceptForRole(user.role)} onChange={(event) => { void uploadMaterials(event.target.files); event.currentTarget.value=''; }}/><Button size="sm" variant="secondary" icon={<FileUp size={15}/>} onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? 'Загрузка…' : 'Прикрепить файл/учебник'}</Button></div>
        <div className="chat-input"><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Сообщение" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }}/><button onClick={() => void sendMessage()}>➤</button></div>
      </aside> : peopleOpen ? <aside className="video-sidepanel people-panel">
        <header><strong>Участники · {participants.length}</strong><button onClick={() => setPeopleOpen(false)}><X size={19}/></button></header>
        <div>{participants.map((person) => <article key={person.identity}><Avatar value={initials(person.name || person.identity)} size="sm"/><span>{person.name || person.identity}{person.identity === room?.localParticipant.identity ? ' (вы)' : ''}</span>{person.attributes.handRaised === 'true' ? <Hand className="raised-hand-inline" size={15}/> : null}{person.isMicrophoneEnabled ? <Mic size={15}/> : <MicOff size={15}/>}</article>)}</div>
      </aside> : materialsOpen ? <aside className="video-sidepanel video-materials-panel">
        <header><strong>Материалы занятия · {materials.length}</strong><button onClick={() => setMaterialsOpen(false)}><X size={19}/></button></header>
        <div className="video-materials-actions"><input hidden id="call-material-files" type="file" multiple accept={attachmentAcceptForRole(user.role)} onChange={(event) => { void uploadMaterials(event.target.files); event.currentTarget.value=''; }}/><label htmlFor="call-material-files" className="video-upload-label"><FileUp size={16}/>{uploading ? 'Загружаем…' : 'Добавить фото, файл или учебник'}</label><Link to="/materials"><Download size={15}/> В хранилище</Link></div>
        <div className="video-materials-list">{materials.length ? materials.map((material) => <LearningMaterialItem key={material.id} material={material} compact allowSave onOpen={setViewerMaterial}/>) : <p className="video-panel-empty">Материалов пока нет. Загруженные файлы сохраняются после завершения звонка.</p>}</div>
      </aside> : null}
    </div>
    <MaterialViewerDialog material={viewerMaterial} onClose={() => setViewerMaterial(null)} />
  </main>;
}
