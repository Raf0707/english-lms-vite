import { BookmarkCheck, BookmarkPlus, Download, ExternalLink, FileArchive, FileAudio, FileImage, FileText, FileVideo, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, type BackendLearningMaterial } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { materialContentUrl } from '../utils/materialUrl';

function MaterialIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <FileImage size={18} />;
  if (mimeType.startsWith('video/')) return <FileVideo size={18} />;
  if (mimeType.startsWith('audio/')) return <FileAudio size={18} />;
  if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('document') || mimeType.includes('word')) return <FileText size={18} />;
  return <FileArchive size={18} />;
}

function formatSize(value?: string | number | null) {
  const bytes = typeof value === 'string' ? Number(value) : Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} КБ`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} МБ`;
  return `${(bytes / 1024 ** 3).toFixed(1)} ГБ`;
}

export function LearningMaterialItem({
  material,
  compact = false,
  allowSave = false,
  allowRemove = false,
  onOpen,
  onSavedChange,
  onRemoved
}: {
  material: BackendLearningMaterial;
  compact?: boolean;
  allowSave?: boolean;
  allowRemove?: boolean;
  onOpen?: (material: BackendLearningMaterial) => void;
  onSavedChange?: (saved: boolean) => void;
  onRemoved?: () => void;
}) {
  const addToast = useAppStore((state) => state.addToast);
  const [saved, setSaved] = useState(Boolean(material.saved || material.scope === 'LIBRARY'));
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const isImage = material.asset.mimeType.startsWith('image/');
  const previewUrl = isImage ? materialContentUrl(material.id, 'inline') : '';

  useEffect(() => { setSaved(Boolean(material.saved || material.scope === 'LIBRARY')); }, [material.id, material.saved, material.scope]);

  const open = () => {
    if (onOpen) {
      onOpen(material);
      return;
    }
    const url = materialContentUrl(material.id, 'inline');
    const tab = window.open(url, '_blank', 'noopener,noreferrer');
    if (!tab) window.location.assign(url);
  };

  const download = () => {
    try {
      const anchor = document.createElement('a');
      anchor.href = materialContentUrl(material.id, 'attachment');
      anchor.download = material.asset.originalName || material.title || 'material';
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      addToast({ title: 'Не удалось скачать файл', text: error instanceof Error ? error.message : 'Ошибка скачивания', tone: 'warning' });
    }
  };

  const toggleSaved = async () => {
    if (saving || material.scope === 'LIBRARY') return;
    setSaving(true);
    try {
      if (saved) await api.materials.unsave(material.id); else await api.materials.save(material.id);
      const next = !saved;
      setSaved(next);
      onSavedChange?.(next);
      addToast({ title: next ? 'Добавлено в материалы' : 'Убрано из сохранённых', text: next ? 'Файл появился во внутреннем хранилище.' : 'Исходный файл в чате или занятии не удалён.', tone: 'success' });
    } catch (error) {
      addToast({ title: 'Не удалось изменить материалы', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (removing || !window.confirm('Убрать этот файл из раздела «Материалы»? Общий файл занятия/чата у других участников не удалится.')) return;
    setRemoving(true);
    try {
      await api.materials.remove(material.id);
      onRemoved?.();
      addToast({ title: 'Материал убран', text: material.scope === 'LIBRARY' ? 'Личная запись удалена из библиотеки.' : 'Общий материал скрыт только из вашего хранилища.', tone: 'success' });
    } catch (error) {
      addToast({ title: 'Не удалось удалить материал', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally { setRemoving(false); }
  };

  return <div className={`learning-material-item-wrap ${compact ? 'learning-material-item-wrap--compact' : ''}`}>
    <div className={`learning-material-item ${compact ? 'learning-material-item--compact' : ''}`}>
      {isImage && previewUrl ? <img src={previewUrl} alt="" /> : <span className="learning-material-item__icon"><MaterialIcon mimeType={material.asset.mimeType} /></span>}
      <span className="learning-material-item__body"><strong>{material.title || material.asset.originalName}</strong><small>{material.asset.originalName !== material.title ? material.asset.originalName : material.asset.mimeType}{formatSize(material.asset.sizeBytes) ? ` · ${formatSize(material.asset.sizeBytes)}` : ''}</small></span>
      <span className="learning-material-item__actions">
        <button type="button" onClick={open} title="Открыть"><ExternalLink size={15}/></button>
        <button type="button" onClick={download} title="Скачать"><Download size={15}/></button>
      </span>
    </div>
    <div className="learning-material-secondary-actions">
      {allowSave && material.scope !== 'LIBRARY' ? <button type="button" className={`learning-material-save ${saved ? 'saved' : ''}`} onClick={() => void toggleSaved()} disabled={saving} title={saved ? 'Убрать из сохранённых' : 'Добавить в материалы'}>{saved ? <BookmarkCheck size={15}/> : <BookmarkPlus size={15}/>}<span>{saving ? 'Сохраняем…' : saved ? 'В материалах' : 'Добавить в материалы'}</span></button> : null}
      {allowRemove ? <button type="button" className="learning-material-remove" onClick={() => void remove()} disabled={removing}><Trash2 size={14}/><span>{removing ? 'Удаляем…' : 'Удалить'}</span></button> : null}
    </div>
  </div>;
}
