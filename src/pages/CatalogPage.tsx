import { Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CourseCard } from '../components/CourseCard';
import { PublicFooter } from '../components/PublicFooter';
import { PublicHeader } from '../components/PublicHeader';
import { Button } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

export function CatalogPage() {
  const allCourses = useAppStore((state) => state.courses);
  const courses = useMemo(() => allCourses.filter((course) => course.status === 'published'), [allCourses]);
  const categories = useMemo(() => ['Все направления', ...Array.from(new Set(courses.map((course) => course.category)))], [courses]);
  const levels = useMemo(() => ['Все уровни', ...Array.from(new Set(courses.map((course) => course.level).filter(Boolean)))], [courses]);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('Все уровни');
  const [category, setCategory] = useState('Все направления');
  const [sort, setSort] = useState('popular');

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
  }, [search, level, category, sort]);

  return (
    <div className="public-page">
      <PublicHeader />
      <main>
        <section className="catalog-hero">
          <div className="container">
            <span className="eyebrow">Каталог</span>
            <h1>Курс, который подходит именно сейчас</h1>
            <p>Выберите уровень и цель. Пробный урок можно открыть до покупки.</p>
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
              {(search || level !== 'Все уровни' || category !== 'Все направления') && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setLevel('Все уровни'); setCategory('Все направления'); }}>
                  Сбросить фильтры
                </Button>
              )}
            </div>
            {filtered.length ? (
              <div className="course-grid course-grid--catalog">
                {filtered.map((course) => <CourseCard key={course.id} course={course} />)}
              </div>
            ) : (
              <div className="catalog-empty">
                <h3>Ничего не найдено</h3>
                <p>Попробуйте изменить запрос или убрать часть фильтров.</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
