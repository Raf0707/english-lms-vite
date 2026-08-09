import { Download, ExternalLink, FileText, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, type BackendLearningMaterial } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui';

export function MaterialViewerDialog({ material, onClose }: { material: BackendLearningMaterial | null; onClose: () => void }) {
  const addToast = useAppStore((state) => state.addToast);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const mime = material?.asset.mimeType?.toLowerCase() ?? '';
  const kind = useMemo(() => {
    if (mime === 'application/pdf') return 'pdf';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('text/')) return 'text';
    return 'file';
  }, [mime]);

  useEffect(() => {
    let alive = true;
    setUrl('');
    if (!material) return () => { alive = false; };
    setLoading(true);
    api.materials.url(material.id, 'inline')
      .then((access) => { if (alive) setUrl(access.url); })
      .catch((error) => { if (alive) addToast({ title: 'Материал не открывается', text: error instanceof Error ? error.message : 'Не удалось получить ссылку', tone: 'warning' }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [addToast, material]);

  if (!material) return null;

  const openNewTab = () => {
    const tab = window.open('about:blank', '_blank');
    if (tab) {
      tab.opener = null;
      tab.location.replace(url);
    } else if (url) {
      window.location.assign(url);
    }
  };

  const download = async () => {
    try {
      const access = await api.materials.url(material.id, 'attachment');
      // Download through a blob when MinIO CORS permits it. This is more reliable than
      // relying on a cross-origin <a> and Content-Disposition alone (PDFs may otherwise open).
      try {
        const response = await fetch(access.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = access.fileName || material.asset.originalName || 'material';
        anchor.rel = 'noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
      } catch {
        // Fallback for deployments where object-storage CORS is intentionally restricted.
        const anchor = document.createElement('a');
        anchor.href = access.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
    } catch (error) {
      addToast({ title: 'Не удалось скачать файл', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    }
  };

  return <div className="material-viewer-backdrop" onMouseDown={onClose} role="presentation">
    <section className="material-viewer" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
      <header>
        <div><strong>{material.title || material.asset.originalName}</strong><small>{material.asset.originalName}</small></div>
        <div className="material-viewer__header-actions">
          <Button size="sm" variant="secondary" icon={<ExternalLink size={15}/>} onClick={openNewTab} disabled={!url}>В новой вкладке</Button>
          <Button size="sm" variant="secondary" icon={<Download size={15}/>} onClick={() => void download()}>Скачать</Button>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть"><X size={20}/></button>
        </div>
      </header>
      <div className="material-viewer__body">
        {loading ? <div className="material-viewer__placeholder">Открываем материал…</div> : null}
        {!loading && url && kind === 'pdf' ? <iframe src={url} title={material.title}/> : null}
        {!loading && url && kind === 'image' ? <img src={url} alt={material.title}/> : null}
        {!loading && url && kind === 'video' ? <video src={url} controls autoPlay={false} /> : null}
        {!loading && url && kind === 'audio' ? <div className="material-viewer__audio"><FileText size={44}/><strong>{material.title}</strong><audio src={url} controls /></div> : null}
        {!loading && url && kind === 'text' ? <iframe src={url} title={material.title}/> : null}
        {!loading && kind === 'file' ? <div className="material-viewer__placeholder"><FileText size={48}/><h3>Этот формат браузер не умеет показывать внутри урока</h3><p>Документ можно открыть системным приложением или скачать. PDF, изображения, видео, аудио и текст открываются прямо здесь.</p><Button icon={<Download size={16}/>} onClick={() => void download()}>Скачать файл</Button></div> : null}
      </div>
    </section>
  </div>;
}
