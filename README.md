## Версия 5.0.0

Исправления V5:

- исправлен runtime-crash вкладки «Администратор → Курсы» (`AdminCourseStatus`);
- добавлен глобальный Error Boundary вместо белого экрана при неожиданной ошибке рендера;
- озвучивание текстовых блоков и выделенного текста переведено на компактную иконку;
- `app-content--wide` использует `max-width: none; padding: 10px;`;
- отметка урока завершённым теперь остаётся на текущем уроке, обновляет прогресс и отдельно предлагает переход дальше;
- усилены проверки `completeLesson` в Zustand;
- переработана визуальная обратная связь drag-and-drop модулей, уроков и блоков, включая пустые области назначения;
- заработало троеточие у учеников преподавателя;
- в свёрнутой панели ученика остаётся огонёк серии с числом 7.

# Lingua LMS — Vite + React + TypeScript

**Версия frontend:** 5.0.0

Полноценный интерактивный frontend образовательной платформы для изучения английского языка, реализованный по техническому заданию.

## Реализованные разделы

- публичный лендинг;
- каталог и фильтрация курсов;
- детальная страница курса и демо-оформление покупки;
- регистрация с обязательным номером телефона;
- авторизация по Email или номеру телефона;
- демо-вход в ролях ученика, преподавателя и администратора;
- личный кабинет ученика;
- список курсов и прогресс;
- экран урока с видео, текстом и тестами;
- выделение английских слов в уроке и добавление в словарь;
- личный словарь, фильтры, ручное добавление и произношение;
- тренажёр интервального повторения SM-2;
- расписание курсовых и отдельных занятий;
- каталог преподавателей с бронированием индивидуальных и групповых занятий;
- проверка камеры и микрофона;
- видеокомната с локальной камерой, микрофоном, screen sharing, чатом и поднятием руки;
- история платежей;
- профиль, безопасность и настройки уведомлений;
- кабинет преподавателя с полноценным конструктором курса;
- создание модулей, уроков, видео, таблиц, тестов, домашних заданий и конференций;
- форматирование текстовых блоков;
- модерация курса администратором перед публикацией;
- административная панель;
- глобальный поиск по платформе;
- сворачиваемая боковая панель до режима иконок;
- адаптивная мобильная версия;
- сохранение демо-состояния в localStorage.

## Демо-роли

На странице входа есть кнопки быстрого входа:

- **Ученик** — курсы, уроки, словарь, тренировки, расписание;
- **Преподаватель** — курсы, ученики, задания, занятия, финансы;
- **Администратор** — пользователи, курсы, платежи, инфраструктура.

Можно использовать Email или номер телефона:

```text
Ученик:        student@lingua.demo  / +7 999 111-22-33
Преподаватель: teacher@lingua.demo  / +7 999 222-33-44
Администратор: admin@lingua.demo    / +7 999 000-00-01
```

Пароль в демо-режиме может быть любым длиной от 8 символов.

## Запуск

Требуется Node.js 18+.

```bash
npm install
npm run dev
```

Production-сборка:

```bash
npm run build
npm run preview
```

Тест алгоритма SM-2:

```bash
npm test
```

## Переменные окружения

Скопируйте `.env.example` в `.env`:

```env
VITE_API_URL=http://localhost:4000/api
VITE_LIVEKIT_URL=wss://video.example.com
VITE_APP_NAME=Lingua
```

## Архитектура проекта

```text
src/
  components/       общие UI-компоненты и layout
  data/             демонстрационные данные
  pages/            страницы приложения
  services/         API-адаптер для production backend
  store/            Zustand + localStorage
  styles/           единая дизайн-система и адаптивность
  types/            доменные типы
  utils/            SM-2, форматирование и вспомогательные функции
```

## Важное различие между демо и production

Vite + React реализуют клиентскую часть платформы. В архиве полностью работает демонстрационная логика интерфейса и локальное сохранение состояния.

Для production необходимо подключить серверную часть, указанную в ТЗ:

- регистрацию и сессии через backend;
- PostgreSQL и Redis;
- S3 и серверное HLS-транскодирование;
- платёжный провайдер и webhook;
- онлайн-кассу;
- серверный перевод;
- LiveKit/Mediasoup и Coturn;
- серверную проверку тестов;
- RBAC и журнал аудита.

Граница подключения уже подготовлена в `src/services/api.ts`. UI не содержит секретных ключей и не пытается реализовать критические платежные операции в браузере.

## Видеокомната

В демо используются браузерные API:

- `getUserMedia()` для камеры и микрофона;
- `getDisplayMedia()` для демонстрации экрана;
- `speechSynthesis` для произношения слов.

Удалённые участники показаны как демонстрационные карточки. Для реальной конференции необходимо получить токен комнаты с backend и подключить официальный SDK LiveKit либо Mediasoup-клиент.

## SPA deployment

В проект включены:

- `public/_redirects` для Netlify;
- `vercel.json` для Vercel.

Для Nginx/Firebase Hosting также нужно направлять неизвестные маршруты на `index.html`.

## Ревизия 2.0

Подробный список изменений находится в `docs/CHANGES_2.0.md`.

## Revision 3 — UI/UX and authoring fixes

The current archive includes the next refinement pass requested during review:

- landing conference avatars are centered with readable initials;
- catalog search layout is fixed;
- course level is a free-text field and catalog filters derive levels from course data;
- test answer choices are edited as separate rows with a `+` button and correct-answer controls;
- course authoring supports browser voice dictation through the Web Speech API;
- lesson pages can read the lesson text aloud through `speechSynthesis`;
- teacher course edit/preview actions and the three-dot context menu are functional;
- sidebar active-state matching handles query-string tabs correctly;
- course modules, lessons and content blocks can be collapsed; a compact floating preview can be toggled;
- landing links “Как учимся” and “Отзывы” scroll to their sections from any public route;
- teacher cards reserve the correct width for avatars;
- teacher sessions and booking availability windows can be edited and deleted;
- student schedule has working list/calendar modes, filters, selectable days, timezone switching and `.ics` export;
- “Моё обучение” search and status filters are functional;
- Support is available directly above Logout in the sidebar;
- the visible keyboard shortcut badge was removed from global search.

Voice features depend on browser Web Speech support. Chrome/Edge/Yandex Browser generally expose speech recognition; text-to-speech uses the voices installed by the browser/OS.

## Изменения версии 4.0.0

- Минимальный размер текста по всему интерфейсу повышен до 12 px.
- Исправлено пустое состояние поиска в «Моём обучении» (`padding: 30px`, иконка и заголовок в одну строку).
- В календарном расписании события показывают время и название; увеличены заголовок месяца и блок часового пояса.
- Поиск каталога ищет одновременно по названию, уровню, категории/направлению, преподавателю и тегам.
- Озвучивание всего урока удалено: доступно озвучивание каждого текстового блока и выделенного пользователем фрагмента.
- Редактор урока поддерживает изображения, видео, аудиофайлы и запись новой аудиодорожки с микрофона через MediaRecorder.
- Добавлены drag-and-drop материалов в урок с автоматическим определением формата, вставка файлов/текста из буфера обмена.
- Модули, уроки и контентные блоки можно перемещать мышью за ручку или стрелками вверх/вниз.
- Модули, уроки и блоки можно копировать и вставлять целиком.
- Поле тегов сохраняет введённые запятые во время редактирования.
- Преподаватель может запросить удаление своего курса; администратор подтверждает или отклоняет запрос. Администратор также может удалить курс напрямую.
- В таблице пользователей администратора работает меню «…»: карточка, смена роли, блокировка/разблокировка и сброс пароля.
- Исправлена раскладка статусов в блоке резервного копирования.

## Revision 6.0.0

- Text-to-speech buttons now toggle to a red stop-square only on the active text fragment and restore automatically when speech ends or is stopped.
- Lesson text selection expands to whole-word boundaries and the translation popup opens near the pointer, stays inside the viewport and can be dragged by its header.
- Course editor drag-and-drop uses dedicated draggable handles plus a synchronous drag reference, fixing module/lesson/block drops while preserving file drops.
- Admin backup status area is now a simple row list instead of a grid; long labels and statuses remain inside the block.
