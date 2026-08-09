import { RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { CourseCard } from '../components/CourseCard';
import { PublicFooter } from '../components/PublicFooter';
import { PublicHeader } from '../components/PublicHeader';
import { Button } from '../components/ui';
import type { Course } from '../types';
import { courseBackend, publicCourseToCourse } from '../services/courseBackend';

export function CatalogPage() {
  const location = useLocation();
  const inStudentApp = location.pathname.startsWith('/app/');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('Все уровни');
  const [category, setCategory] = useState('Все направления');
  const [sort, setSort] = useState('popular');

  const loadCatalog = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const result = await courseBackend.listPublic();
      setCourses(result.items.map(publicCourseToCourse));
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить каталог');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadCatalog();
    const reload = () => { if (mounted) void loadCatalog(true); };
    const onVisibility = () => { if (document.visibilityState === 'visible') reload(); };
    window.addEventListener('focus', reload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      mounted = false;
      window.removeEventListener('focus', reload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadCatalog]);

  const categories = useMemo(() => ['Все направления', ...Array.from(new Set(courses.map((course) => course.category).filter(Boolean)))], [courses]);
  const levels = useMemo(() => ['Все уровни', ...Array.from(new Set(courses.map((course) => course.level).filter(Boolean)))], [courses]);

  const filtered = useMemo(() => {
    const data = courses.filter((course) => {
      const matchesSearch = `${course.title} ${course.shortDescription} ${course.level} ${course.category} ${course.instructor} ${course.tags.join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesLevel = level === 'Все уровни' || course.level === level;
      const matchesCategory = category === 'Все направления' || course.category === category;
      return matchesSearch && matchesLevel && matchesCategory;
    });
    return [...data].sort((a, b) => {
      if (sort === 'priceLow') return a.price - b.price;
      if (sort === 'priceHigh') return b.price - a.price;
      if (sort === 'rating') return b.rating - a.rating;
      return b.students - a.students;
    });
  }, [courses, search, level, category, sort]);

  const content = (
    <>
      <section className={inStudentApp ? 'catalog-hero catalog-hero--app' : 'catalog-hero'}>
        <div className="container">
          <span className="eyebrow">Каталог</span>
          <h1>Курс, который подходит именно сейчас</h1>
          <p>Выберите уровень и цель. После публикации администратором курс появляется здесь автоматически.</p>
        </div>
      </section>
      <section className="catalog-section">
        <div className="container">
          <div className="catalog-toolbar">
            <label className="catalog-search">
              <Search size={19} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Название, уровень, направление, категория или навык" />
            </label>
            <label>
              <span>Уровень</span>
              <select value={level} onChange={(event) => setLevel(event.target.value)}>
                {levels.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Направление</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Сортировка</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="popular">По популярности</option>
                <option value="rating">По рейтингу</option>
                <option value="priceLow">Сначала дешевле</option>
                <option value="priceHigh">Сначала дороже</option>
              </select>
            </label>
          </div>
          <div className="catalog-summary">
            <span><SlidersHorizontal size={17} /> Найдено: {filtered.length}</span>
            <div className="catalog-summary__actions">
              <Button variant="ghost" size="sm" icon={<RefreshCw size={15} className={refreshing ? 'spin' : ''}/>} onClick={() => void loadCatalog(true)} disabled={refreshing}>Обновить</Button>
              {(search || level !== 'Все уровни' || category !== 'Все направления') && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setLevel('Все уровни'); setCategory('Все направления'); }}>
                  Сбросить фильтры
                </Button>
              )}
            </div>
          </div>
          {loading ? (
            <div className="catalog-empty"><h3>Загружаем каталог…</h3><p>Получаем текущие опубликованные версии курсов из backend.</p></div>
          ) : loadError ? (
            <div className="catalog-empty"><h3>Каталог временно недоступен</h3><p>{loadError}</p><Button variant="secondary" onClick={() => void loadCatalog()}>Повторить</Button></div>
          ) : filtered.length ? (
            <div className="course-grid course-grid--catalog">
              {filtered.map((course) => <CourseCard key={course.id} course={course} />)}
            </div>
          ) : (
            <div className="catalog-empty">
              <h3>{courses.length ? 'Ничего не найдено' : 'Опубликованных курсов пока нет'}</h3>
              <p>{courses.length ? 'Попробуйте изменить запрос или убрать часть фильтров.' : 'Если курс только что опубликован, нажмите «Обновить». Каталог показывает currentPublishedVersion из backend.'}</p>
            </div>
          )}
        </div>
      </section>
    </>
  );

  if (inStudentApp) {
    return <AppLayout title="Каталог курсов" subtitle="Все опубликованные курсы платформы">{content}</AppLayout>;
  }

  return (
    <div className="public-page">
      <PublicHeader />
      <main>{content}</main>
      <PublicFooter />
    </div>
  );
}
