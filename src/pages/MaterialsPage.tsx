import { Archive, BookmarkCheck, BookOpen, RefreshCw, Search, UploadCloud } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { AppLayout } from '../components/AppLayout';
import { LearningMaterialItem } from '../components/LearningMaterialItem';
import { MaterialViewerDialog } from '../components/MaterialViewerDialog';
import { Button, Card } from '../components/ui';
import { api, type BackendAssetKind, type BackendLearningMaterial } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { attachmentAcceptForRole, validateAttachmentForRole } from '../utils/fileUploadPolicy';

function fileKind(file: File): BackendAssetKind {
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type.startsWith('video/')) return 'VIDEO';
  if (file.type.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
}

export function MaterialsPage() {
  const addToast = useAppStore((state) => state.addToast);
  const user = useAppStore((state) => state.user)!;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [materials, setMaterials] = useState<BackendLearningMaterial[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewerMaterial, setViewerMaterial] = useState<BackendLearningMaterial | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setMaterials(await api.materials.mine()); }
    catch (error) { addToast({ title: 'Не удалось загрузить материалы', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' }); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { void load(); }, [load]);

  const uploadLibrary = async (files: FileList | null) => {
    if (!files?.length || uploading) return;
    const selected = Array.from(files).slice(0, 10).filter((file) => {
      const error = validateAttachmentForRole(file, user.role);
      if (!error) return true;
      addToast({ title: 'Файл запрещён', text: `${file.name}: ${error}`, tone: 'warning' });
      return false;
    });
    if (!selected.length) return;
    setUploading(true);
    try {
      for (const file of selected) {
        const asset = await api.media.upload(file, fileKind(file));
        await api.materials.attachLibrary(asset.assetId, file.name);
      }
      await load();
      addToast({ title: selected.length === 1 ? 'Материал добавлен' : 'Материалы добавлены', text: 'Файлы сохранены во внутреннем хранилище и доступны из раздела «Мои материалы».', tone: 'success' });
    } catch (error) {
      addToast({ title: 'Не удалось добавить материал', text: error instanceof Error ? error.message : 'Ошибка backend/хранилища', tone: 'warning' });
    } finally { setUploading(false); }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter((item) => `${item.title} ${item.asset.originalName} ${item.event?.title ?? ''}`.toLowerCase().includes(q));
  }, [materials, query]);

  const libraryMaterials = filtered.filter((item) => item.scope === 'LIBRARY');
  const savedMaterials = filtered.filter((item) => item.scope !== 'LIBRARY' && item.saved);
  const sessionMaterials = filtered.filter((item) => item.scope === 'SESSION' && !item.saved);
  const chatMaterials = filtered.filter((item) => item.scope === 'CHAT' && !item.saved);

  const card = (material: BackendLearningMaterial, context: string, detail?: string) => <Card key={`${context}-${material.id}`} className="material-library-card">
    <div><small>{context}</small><strong>{material.title}</strong>{detail ? <span>{detail}</span> : null}</div>
    <LearningMaterialItem material={material} allowRemove onOpen={setViewerMaterial} onRemoved={() => void load()} />
  </Card>;

  return <AppLayout title="Учебные материалы" subtitle="Личное хранилище, файлы занятий и учебных чатов. Нужный файл из чата или звонка можно отдельно сохранить в свою библиотеку.">
    <div className="materials-toolbar">
      <label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти материал, занятие или файл"/></label>
      <div className="materials-toolbar__actions">
        <input ref={fileInputRef} hidden type="file" multiple accept={attachmentAcceptForRole(user.role)} onChange={(event) => { void uploadLibrary(event.target.files); event.currentTarget.value = ''; }}/>
        <Button icon={<UploadCloud size={16}/>} onClick={() => fileInputRef.current?.click()} loading={uploading}>Добавить материалы</Button>
        <Button variant="secondary" icon={<RefreshCw size={16}/>} onClick={() => void load()}>Обновить</Button>
      </div>
    </div>
    <div className="materials-summary-grid">
      <Card><span><BookOpen size={18}/> Мои материалы</span><strong>{libraryMaterials.length}</strong><small>учебников, документов и файлов, загруженных с устройства</small></Card>
      <Card><span><BookmarkCheck size={18}/> Сохранённые</span><strong>{savedMaterials.length}</strong><small>файлов, которые вы добавили из чатов и занятий</small></Card>
      <Card><span><Archive size={18}/> Занятия и чаты</span><strong>{sessionMaterials.length + chatMaterials.length}</strong><small>материалов, доступных по учебным взаимодействиям</small></Card>
    </div>
    {loading ? <Card className="materials-empty"><p>Загружаем внутреннее хранилище…</p></Card> : null}
    {!loading && !filtered.length ? <Card className="materials-empty"><BookOpen size={38}/><h2>Материалов пока нет</h2><p>Добавьте учебник или документ с устройства либо сохраните файл из чата/занятия.</p></Card> : null}
    {libraryMaterials.length ? <section className="materials-section"><header><h2>Мои материалы</h2><span>{libraryMaterials.length}</span></header><div className="materials-grid">{libraryMaterials.map((material) => card(material, 'Личная библиотека', new Date(material.createdAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })))}</div></section> : null}
    {savedMaterials.length ? <section className="materials-section"><header><h2>Сохранённые</h2><span>{savedMaterials.length}</span></header><div className="materials-grid">{savedMaterials.map((material) => card(material, material.scope === 'SESSION' ? material.event?.title ?? 'Занятие' : 'Учебный чат', new Date(material.createdAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })))}</div></section> : null}
    {sessionMaterials.length ? <section className="materials-section"><header><h2>Материалы занятий</h2><span>{sessionMaterials.length}</span></header><div className="materials-grid">{sessionMaterials.map((material) => card(material, material.event?.title ?? 'Занятие', material.event?.startAt ? new Date(material.event.startAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) : undefined))}</div></section> : null}
    {chatMaterials.length ? <section className="materials-section"><header><h2>Материалы из чатов</h2><span>{chatMaterials.length}</span></header><div className="materials-grid">{chatMaterials.map((material) => card(material, 'Учебный чат', new Date(material.createdAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })))}</div></section> : null}
    <MaterialViewerDialog material={viewerMaterial} onClose={() => setViewerMaterial(null)} />
  </AppLayout>;
}
