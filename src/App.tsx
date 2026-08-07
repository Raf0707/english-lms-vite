import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthBootstrap } from './components/AuthBootstrap';
import { Toasts } from './components/Toasts';
import { AdminPage } from './pages/AdminPage';
import { CatalogPage } from './pages/CatalogPage';
import { CoursePage } from './pages/CoursePage';
import { CourseEditorPage } from './pages/CourseEditorPage';
import { DashboardPage } from './pages/DashboardPage';
import { DictionaryPage } from './pages/DictionaryPage';
import { HomePage } from './pages/HomePage';
import { LearningPage } from './pages/LearningPage';
import { LessonPage } from './pages/LessonPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { SchedulePage } from './pages/SchedulePage';
import { TeacherPage } from './pages/TeacherPage';
import { TrainingPage } from './pages/TrainingPage';
import { TutoringPage } from './pages/TutoringPage';
import { VideoRoomPage } from './pages/VideoRoomPage';

export default function App() {
  return (
    <AuthBootstrap>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/teachers" element={<TutoringPage publicMode />} />
        <Route path="/course/:slug" element={<CoursePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/app" element={<ProtectedRoute roles={['student']}><DashboardPage /></ProtectedRoute>} />
        <Route path="/app/learning" element={<ProtectedRoute roles={['student']}><LearningPage /></ProtectedRoute>} />
        <Route path="/app/teachers" element={<ProtectedRoute roles={['student']}><TutoringPage /></ProtectedRoute>} />
        <Route path="/app/course/:courseId/lesson/:lessonId" element={<ProtectedRoute roles={['student']}><LessonPage /></ProtectedRoute>} />
        <Route path="/app/dictionary" element={<ProtectedRoute roles={['student']}><DictionaryPage /></ProtectedRoute>} />
        <Route path="/app/training" element={<ProtectedRoute roles={['student']}><TrainingPage /></ProtectedRoute>} />
        <Route path="/app/schedule" element={<ProtectedRoute roles={['student']}><SchedulePage /></ProtectedRoute>} />
        <Route path="/app/video/:sessionId" element={<ProtectedRoute roles={['student', 'teacher']}><VideoRoomPage /></ProtectedRoute>} />
        <Route path="/app/payments" element={<ProtectedRoute roles={['student']}><PaymentsPage /></ProtectedRoute>} />
        <Route path="/app/profile" element={<ProtectedRoute roles={['student']}><ProfilePage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute roles={['student', 'teacher', 'admin']}><ProfilePage /></ProtectedRoute>} />
        <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><TeacherPage /></ProtectedRoute>} />
        <Route path="/teacher/course/new" element={<ProtectedRoute roles={['teacher']}><CourseEditorPage /></ProtectedRoute>} />
        <Route path="/teacher/course/:courseId/edit" element={<ProtectedRoute roles={['teacher']}><CourseEditorPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
        <Route path="/admin/course/new" element={<ProtectedRoute roles={['admin']}><CourseEditorPage /></ProtectedRoute>} />
        <Route path="/admin/course/:courseId/edit" element={<ProtectedRoute roles={['admin']}><CourseEditorPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toasts />
      </BrowserRouter>
    </AuthBootstrap>
  );
}
