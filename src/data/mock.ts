import type { Course, DictionaryEntry, Notification, Payment, Session, User } from '../types';

const commonTest = {
  id: 'test-basics',
  title: 'Проверка понимания',
  passScore: 70,
  questions: [
    {
      id: 'q1',
      type: 'single' as const,
      prompt: 'Какой вариант лучше всего подходит для знакомства?',
      options: ['How do you do?', 'Where you are?', 'What do you?', 'How is name?'],
      correctAnswer: 'How do you do?',
      explanation: 'How do you do? — формальная фраза для первого знакомства.'
    },
    {
      id: 'q2',
      type: 'single' as const,
      prompt: 'Выберите правильный перевод: “I usually start work at nine.”',
      options: [
        'Я закончил работу в девять',
        'Я обычно начинаю работу в девять',
        'Я редко работаю до девяти',
        'Я сейчас начинаю работать'
      ],
      correctAnswer: 'Я обычно начинаю работу в девять'
    },
    {
      id: 'q3',
      type: 'text' as const,
      prompt: 'Введите английское слово со значением «уверенность».',
      correctAnswer: 'confidence',
      explanation: 'Confidence — уверенность.'
    }
  ]
};

export const courses: Course[] = [
  {
    id: 'everyday-a1',
    slug: 'everyday-english-a1',
    title: 'Английский для жизни: уверенный старт',
    shortDescription: 'Спокойный курс с нуля: повседневные ситуации, речь и понятная грамматика.',
    description:
      'Курс помогает начать говорить по-английски без перегрузки. Короткие уроки, живые диалоги, повторение слов и регулярная практика формируют устойчивую базу для общения в путешествиях и повседневной жизни.',
    cover: '/course-1.svg',
    level: 'A1',
    category: 'Общий английский',
    instructor: 'Наталья Орлова',
    instructorAvatar: 'НО',
    price: 12900,
    oldPrice: 15900,
    rating: 4.9,
    reviews: 184,
    duration: '8 недель',
    students: 1248,
    accent: '#1f5a48',
    tags: ['С нуля', 'Разговорный', 'Словарь'],
    outcomes: [
      'Представляться и поддерживать простой диалог',
      'Рассказывать о себе, семье и ежедневных делах',
      'Понимать ключевые фразы в поездке',
      'Использовать базовые времена без зубрёжки'
    ],
    modules: [
      {
        id: 'm1',
        title: 'Начинаем говорить',
        description: 'Знакомство, приветствия и первые уверенные фразы.',
        lessons: [
          {
            id: 'l1',
            title: 'Знакомство без неловкости',
            duration: 14,
            type: 'video',
            isPreview: true,
            blocks: [
              { id: 'b1', type: 'heading', title: 'Your first confident conversation' },
              {
                id: 'b2',
                type: 'text',
                content:
                  'When you meet someone for the first time, keep the conversation simple. Say your name, ask a friendly question and listen carefully. Confidence grows when you use short, clear phrases instead of trying to build a perfect sentence.'
              },
              {
                id: 'b3',
                type: 'callout',
                title: 'Полезная формула',
                content: 'Hi, I’m Anna. Nice to meet you. What brings you here?'
              },
              {
                id: 'b4',
                type: 'text',
                content:
                  'Notice how the speaker uses a warm greeting and one open question. You can adapt the same pattern for a hotel, a class, a conference or a neighbourly conversation.'
              }
            ]
          },
          {
            id: 'l2',
            title: 'Глагол to be без путаницы',
            duration: 18,
            type: 'text',
            blocks: [
              { id: 'b1', type: 'heading', title: 'I am, you are, she is' },
              {
                id: 'b2',
                type: 'text',
                content:
                  'The verb “to be” helps us describe people, places and feelings. I am ready. You are welcome. She is at home. Start with these three patterns and repeat them aloud.'
              },
              {
                id: 'b3',
                type: 'quote',
                content: 'Small practice every day is more useful than one exhausting lesson a week.'
              }
            ]
          },
          {
            id: 'l3',
            title: 'Мини-тест: знакомство',
            duration: 8,
            type: 'test',
            blocks: [],
            test: commonTest
          }
        ]
      },
      {
        id: 'm2',
        title: 'Мой обычный день',
        description: 'Распорядок дня и настоящее простое время.',
        lessons: [
          {
            id: 'l4',
            title: 'Как рассказать о своём дне',
            duration: 16,
            type: 'video',
            blocks: [
              { id: 'b1', type: 'heading', title: 'Daily routines' },
              {
                id: 'b2',
                type: 'text',
                content:
                  'I usually wake up at seven, make coffee and check my plans. In the afternoon I work, study or meet friends. In the evening I slow down and prepare for the next day.'
              }
            ]
          },
          {
            id: 'l5',
            title: 'Наречия частоты',
            duration: 12,
            type: 'practice',
            blocks: [
              {
                id: 'b1',
                type: 'text',
                content:
                  'Use always, usually, often, sometimes, rarely and never to describe frequency. Place them before the main verb: I often read in English. With “to be”, place them after: I am usually tired on Friday.'
              }
            ]
          }
        ]
      },
      {
        id: 'm3',
        title: 'В городе и в поездке',
        description: 'Транспорт, кафе, отель и ориентирование.',
        lessons: [
          {
            id: 'l6',
            title: 'В кафе: заказ без стресса',
            duration: 15,
            type: 'video',
            blocks: [
              {
                id: 'b1',
                type: 'text',
                content:
                  'Could I have a cup of tea, please? I would like the soup and a salad. These polite structures work in cafés, restaurants and hotel breakfast rooms.'
              }
            ]
          },
          {
            id: 'l7',
            title: 'Как спросить дорогу',
            duration: 13,
            type: 'text',
            blocks: [
              {
                id: 'b1',
                type: 'text',
                content:
                  'Excuse me, how can I get to the station? Go straight, turn left at the bank and continue for two minutes. The station is opposite the park.'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'travel-a2',
    slug: 'travel-english-a2',
    title: 'Английский для путешествий',
    shortDescription: 'Аэропорт, отель, кафе, покупки и непредвиденные ситуации.',
    description:
      'Практический курс для поездок. Вы научитесь быстро ориентироваться в типовых ситуациях и говорить вежливо, даже если словарный запас пока небольшой.',
    cover: '/course-2.svg',
    level: 'A2',
    category: 'Путешествия',
    instructor: 'Мария Белова',
    instructorAvatar: 'МБ',
    price: 8900,
    rating: 4.8,
    reviews: 96,
    duration: '5 недель',
    students: 730,
    accent: '#6657a7',
    tags: ['Путешествия', 'Диалоги', 'Практика'],
    outcomes: [
      'Пройти регистрацию в аэропорту',
      'Объяснить проблему в отеле',
      'Заказать еду и уточнить состав блюда',
      'Попросить помощь и понять ответ'
    ],
    modules: [
      {
        id: 'tm1',
        title: 'Аэропорт и перелёт',
        description: 'От регистрации до получения багажа.',
        lessons: [
          {
            id: 'tl1',
            title: 'Check-in и посадка',
            duration: 17,
            type: 'video',
            isPreview: true,
            blocks: [
              {
                id: 'tb1',
                type: 'text',
                content:
                  'Keep your passport and booking reference ready. Ask: Could I have an aisle seat? Is my flight on time? Where is the boarding gate?'
              }
            ]
          },
          {
            id: 'tl2',
            title: 'Если потерялся багаж',
            duration: 12,
            type: 'practice',
            blocks: [
              {
                id: 'tb2',
                type: 'text',
                content:
                  'My suitcase did not arrive. It is medium-sized, dark blue and has a red tag. Here is my baggage receipt.'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'conversation-b1',
    slug: 'conversation-english-b1',
    title: 'Разговорная практика B1',
    shortDescription: 'Темы для живого общения, полезные связки и регулярные разговорные клубы.',
    description:
      'Курс для тех, кто понимает английский, но хочет быстрее формулировать мысли и звучать естественнее в беседе.',
    cover: '/course-3.svg',
    level: 'B1',
    category: 'Разговорный английский',
    instructor: 'Алексей Грин',
    instructorAvatar: 'АГ',
    price: 14900,
    oldPrice: 17900,
    rating: 4.9,
    reviews: 121,
    duration: '10 недель',
    students: 884,
    accent: '#b15f46',
    tags: ['B1', 'Разговорный клуб', 'Обратная связь'],
    outcomes: [
      'Говорить дольше без пауз',
      'Использовать связки и уточняющие вопросы',
      'Выражать мнение и аргументировать',
      'Уверенно участвовать в групповом разговоре'
    ],
    modules: [
      {
        id: 'cm1',
        title: 'Свободная беседа',
        description: 'Как начать, продолжить и завершить разговор.',
        lessons: [
          {
            id: 'cl1',
            title: 'Small talk that feels natural',
            duration: 20,
            type: 'video',
            isPreview: true,
            blocks: [
              {
                id: 'cb1',
                type: 'text',
                content:
                  'Good small talk is not about perfect grammar. It is about curiosity, active listening and a few flexible questions that keep the conversation moving.'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'grammar-a2',
    slug: 'grammar-without-stress-a2',
    title: 'Грамматика без стресса',
    shortDescription: 'Система времён и конструкций на понятных жизненных примерах.',
    description:
      'Наглядный курс, который собирает разрозненные знания в систему. Вместо длинных правил — короткие схемы, контекст и практика.',
    cover: '/course-4.svg',
    level: 'A2–B1',
    category: 'Грамматика',
    instructor: 'Елена Соколова',
    instructorAvatar: 'ЕС',
    price: 9900,
    rating: 4.7,
    reviews: 79,
    duration: '7 недель',
    students: 611,
    accent: '#386b91',
    tags: ['Грамматика', 'Схемы', 'Практика'],
    outcomes: [
      'Различать основные времена',
      'Строить вопросы и отрицания',
      'Использовать модальные глаголы',
      'Избегать типичных ошибок'
    ],
    modules: [
      {
        id: 'gm1',
        title: 'Времена как система',
        description: 'Настоящее, прошлое и будущее без хаоса.',
        lessons: [
          {
            id: 'gl1',
            title: 'Present Simple vs Present Continuous',
            duration: 18,
            type: 'video',
            isPreview: true,
            blocks: [
              {
                id: 'gb1',
                type: 'text',
                content:
                  'Use Present Simple for routines and facts. Use Present Continuous for actions happening now or around now. Compare: I work from home. I am working on a new project this week.'
              }
            ]
          }
        ]
      }
    ]
  }
];

export const demoUsers: Record<'student' | 'teacher' | 'admin', User> = {
  student: {
    id: 'u-student',
    name: 'Анна Воронцова',
    email: 'student@lingua.demo',
    role: 'student',
    avatar: 'АВ',
    level: 'A1',
    timezone: 'Europe/Moscow'
  },
  teacher: {
    id: 'u-teacher',
    name: 'Наталья Орлова',
    email: 'teacher@lingua.demo',
    role: 'teacher',
    avatar: 'НО',
    level: 'C2',
    timezone: 'Europe/Moscow'
  },
  admin: {
    id: 'u-admin',
    name: 'Администратор',
    email: 'admin@lingua.demo',
    role: 'admin',
    avatar: 'AD',
    timezone: 'Europe/Moscow'
  }
};

export const initialDictionary: DictionaryEntry[] = [
  {
    id: 'd1',
    word: 'confidence',
    translation: 'уверенность',
    context: 'Confidence grows when you use short, clear phrases.',
    courseId: 'everyday-a1',
    lessonId: 'l1',
    status: 'review',
    repetitions: 2,
    interval: 4,
    easeFactor: 2.5,
    nextReviewAt: new Date().toISOString(),
    createdAt: '2026-08-01T10:00:00.000Z'
  },
  {
    id: 'd2',
    word: 'carefully',
    translation: 'внимательно, осторожно',
    context: 'Listen carefully and ask one friendly question.',
    courseId: 'everyday-a1',
    lessonId: 'l1',
    status: 'learning',
    repetitions: 1,
    interval: 1,
    easeFactor: 2.4,
    nextReviewAt: new Date().toISOString(),
    createdAt: '2026-08-02T09:00:00.000Z'
  },
  {
    id: 'd3',
    word: 'usually',
    translation: 'обычно',
    context: 'I usually wake up at seven.',
    courseId: 'everyday-a1',
    lessonId: 'l4',
    status: 'new',
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    nextReviewAt: new Date().toISOString(),
    createdAt: '2026-08-03T12:00:00.000Z'
  },
  {
    id: 'd4',
    word: 'aisle',
    translation: 'проход между рядами',
    context: 'Could I have an aisle seat?',
    courseId: 'travel-a2',
    lessonId: 'tl1',
    status: 'mastered',
    repetitions: 5,
    interval: 28,
    easeFactor: 2.7,
    nextReviewAt: '2026-08-30T10:00:00.000Z',
    createdAt: '2026-07-20T10:00:00.000Z'
  }
];

export const sessions: Session[] = [
  {
    id: 's1',
    title: 'Разговорная практика: знакомство',
    type: 'group',
    courseId: 'everyday-a1',
    instructor: 'Наталья Орлова',
    startAt: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
    duration: 60,
    attendees: 8,
    maxAttendees: 12,
    status: 'scheduled'
  },
  {
    id: 's2',
    title: 'Индивидуальная консультация',
    type: 'individual',
    courseId: 'everyday-a1',
    instructor: 'Наталья Орлова',
    startAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    duration: 45,
    attendees: 1,
    maxAttendees: 1,
    status: 'scheduled'
  },
  {
    id: 's3',
    title: 'English coffee club',
    type: 'webinar',
    courseId: 'conversation-b1',
    instructor: 'Алексей Грин',
    startAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    duration: 75,
    attendees: 22,
    maxAttendees: 30,
    status: 'completed'
  }
];

export const payments: Payment[] = [
  {
    id: 'p1',
    number: 'LNG-2026-00481',
    title: 'Английский для жизни: уверенный старт',
    amount: 12900,
    date: '2026-07-28T12:20:00.000Z',
    status: 'paid',
    receiptUrl: '#'
  },
  {
    id: 'p2',
    number: 'LNG-2026-00398',
    title: 'Индивидуальная консультация',
    amount: 2500,
    date: '2026-07-14T17:45:00.000Z',
    status: 'paid',
    receiptUrl: '#'
  }
];

export const notifications: Notification[] = [
  {
    id: 'n1',
    title: 'Занятие завтра',
    text: 'Разговорная практика начнётся завтра в 19:00.',
    date: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: false,
    type: 'session'
  },
  {
    id: 'n2',
    title: 'Слова готовы к повторению',
    text: 'Сегодня вас ждут 3 карточки. Это займёт около 4 минут.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    read: false,
    type: 'lesson'
  },
  {
    id: 'n3',
    title: 'Оплата прошла успешно',
    text: 'Доступ к курсу открыт. Чек доступен в разделе «Платежи».',
    date: '2026-07-28T12:22:00.000Z',
    read: true,
    type: 'payment'
  }
];
