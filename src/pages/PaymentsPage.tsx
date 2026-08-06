import { CheckCircle2, CreditCard, Download, ExternalLink, ReceiptText, RotateCcw } from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { Badge, Button, Card } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { formatMoney, formatShortDate } from '../utils/format';

export function PaymentsPage() {
  const payments = useAppStore((state) => state.payments);
  const total = payments.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0);
  return (
    <AppLayout title="Платежи" subtitle="История заказов, чеки и статусы возвратов.">
      <div className="payment-summary-grid">
        <Card><span><CreditCard size={20} /> Оплачено</span><strong>{formatMoney(total)}</strong><small>{payments.filter((item) => item.status === 'paid').length} успешных платежа</small></Card>
        <Card><span><ReceiptText size={20} /> Чеки</span><strong>{payments.filter((item) => item.receiptUrl).length}</strong><small>доступны для скачивания</small></Card>
        <Card><span><RotateCcw size={20} /> Возвраты</span><strong>{payments.filter((item) => item.status === 'refunded').length}</strong><small>за всё время</small></Card>
      </div>
      <Card className="payments-card">
        <header><div><h2>История операций</h2><p>Все суммы указаны в рублях.</p></div><Button variant="secondary" size="sm" icon={<Download size={17} />}>Скачать выписку</Button></header>
        <div className="payments-table-wrap">
          <table className="payments-table">
            <thead><tr><th>Заказ</th><th>Наименование</th><th>Дата</th><th>Сумма</th><th>Статус</th><th>Чек</th></tr></thead>
            <tbody>{payments.map((payment) => <tr key={payment.id}><td><strong>{payment.number}</strong></td><td>{payment.title}</td><td>{formatShortDate(payment.date)}</td><td><strong>{formatMoney(payment.amount)}</strong></td><td><Badge tone={payment.status === 'paid' ? 'green' : payment.status === 'refunded' ? 'amber' : 'red'}>{payment.status === 'paid' ? 'Оплачен' : payment.status === 'refunded' ? 'Возвращён' : payment.status === 'pending' ? 'Ожидает' : 'Ошибка'}</Badge></td><td>{payment.receiptUrl ? <button className="receipt-link"><ExternalLink size={16} /> Открыть</button> : '—'}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
      <Card className="payment-help"><CheckCircle2 size={22} /><div><strong>Нужна помощь с оплатой?</strong><p>Напишите в поддержку и укажите номер заказа — мы проверим статус операции.</p></div><Button variant="ghost">Обратиться в поддержку</Button></Card>
    </AppLayout>
  );
}
