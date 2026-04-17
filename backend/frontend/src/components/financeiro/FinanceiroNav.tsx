import { NavLink } from 'react-router-dom';

const items = [
  { to: '/financeiro', label: 'Painel' },
  { to: '/financeiro/receber', label: 'Contas a Receber' },
  { to: '/financeiro/pagar', label: 'Contas a Pagar' },
  { to: '/financeiro/tesouraria', label: 'Tesouraria' },
  { to: '/financeiro/plano-contas', label: 'Plano de Contas' },
];

export default function FinanceiroNav() {
  return (
    <div className="subnav">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/financeiro'} className={({ isActive }) => `subnav__link${isActive ? ' subnav__link--active' : ''}`}>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
