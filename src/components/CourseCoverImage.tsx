import type { ImgHTMLAttributes } from 'react';
import { useCourseCoverUrl } from '../hooks/useCourseCoverUrl';
import type { Course } from '../types';

export function CourseCoverImage({ course, mode = 'public', ...props }: { course: Course; mode?: 'public' | 'private' } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>) {
  const url = useCourseCoverUrl(course.coverAssetId, course.cover, mode);
  return <img {...props} src={url} />;
}
