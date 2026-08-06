import { Clock3, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Course } from '../types';
import { formatMoney } from '../utils/format';
import { Badge } from './ui';

export function CourseCard({ course, compact = false }: { course: Course; compact?: boolean }) {
  return (
    <article className={`course-card ${compact ? 'course-card--compact' : ''}`}>
      <Link to={`/course/${course.slug}`} className="course-card__cover">
        <img src={course.cover} alt="" />
        <span className="course-card__level">{course.level}</span>
      </Link>
      <div className="course-card__body">
        <div className="course-card__tags">
          {course.tags.slice(0, compact ? 1 : 2).map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
        <Link to={`/course/${course.slug}`} className="course-card__title">
          {course.title}
        </Link>
        <p>{course.shortDescription}</p>
        <div className="course-card__meta">
          <span><Star size={15} fill="currentColor" /> {course.rating}</span>
          <span><Users size={15} /> {course.students}</span>
          <span><Clock3 size={15} /> {course.duration}</span>
        </div>
        <div className="course-card__footer">
          <div className="course-card__teacher">
            <span>{course.instructorAvatar}</span>
            <small>{course.instructor}</small>
          </div>
          <div className="course-card__price">
            {course.oldPrice ? <s>{formatMoney(course.oldPrice)}</s> : null}
            <strong>{formatMoney(course.price)}</strong>
          </div>
        </div>
      </div>
    </article>
  );
}
