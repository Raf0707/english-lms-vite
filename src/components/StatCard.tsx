import type { ReactNode } from 'react';
import { Card } from './ui';

export function StatCard({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note?: string }) {
  return (
    <Card className="stat-card">
      <div className="stat-card__icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {note ? <small>{note}</small> : null}
      </div>
    </Card>
  );
}
