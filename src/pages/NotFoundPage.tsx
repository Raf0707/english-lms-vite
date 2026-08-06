import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export function NotFoundPage() {
  return <main className="not-found-page"><div className="not-found-page__number">404</div><h1>Такой страницы нет</h1><p>Возможно, ссылка устарела или адрес был введён с ошибкой.</p><Link to="/"><Button icon={<ArrowLeft size={18}/>}>Вернуться на главную</Button></Link></main>;
}
