import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  chips?: { label: string; alert?: boolean }[];
}

export default function PageHeader({ title, subtitle, actions, chips }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <div className="page-header__title-row">
          <h2>{title}</h2>
          {chips && chips.length > 0 ? (
            <div className="page-header__chips">
              {chips.map((c) => (
                <span key={c.label} className={`page-header__chip${c.alert ? ' page-header__chip--alert' : ''}`}>
                  {c.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </div>
  );
}
