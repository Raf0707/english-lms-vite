# Production checklist

## Backend

- [ ] Реализовать REST API по контракту из `src/services/api.ts`.
- [ ] Перенести авторизацию из localStorage в защищённые HttpOnly cookies.
- [ ] Реализовать серверный RBAC.
- [ ] Подключить PostgreSQL, Redis и очередь фоновых задач.
- [ ] Проверять тесты только на сервере.

## Media

- [ ] Закрытое S3-хранилище.
- [ ] Multipart upload.
- [ ] Антивирусная проверка.
- [ ] Очередь FFmpeg-транскодирования.
- [ ] HLS adaptive bitrate.
- [ ] Подписанные ссылки и контроль доступа.

## Payments

- [ ] Заказ рассчитывается на backend.
- [ ] Идемпотентность создания платежа.
- [ ] Проверка webhook.
- [ ] Транзакционная выдача доступа.
- [ ] Онлайн-касса и возвраты.
- [ ] Реестр партнёрских начислений.

## Video

- [ ] Развернуть LiveKit/Mediasoup.
- [ ] Развернуть Coturn.
- [ ] Выдавать короткоживущие токены с backend.
- [ ] Настроить simulcast и adaptive stream.
- [ ] Провести нагрузочный тест на 50 участников.

## Security

- [ ] 2FA для административных ролей.
- [ ] Rate limiting.
- [ ] CSP и security headers.
- [ ] Audit log.
- [ ] Backup и тест восстановления.
- [ ] SAST, DAST и dependency scanning.
