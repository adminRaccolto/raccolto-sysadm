import { NavLink } from 'react-router-dom';

const items = [
  { to: '/sistema', label: 'Identidade & Saúde' },
  { to: '/empresas', label: 'Empresas' },
  { to: '/usuarios', label: 'Usuários' },
  { to: '/perfis-acesso', label: 'Perfis & Permissões' },
];

export default function SystemNav() {
  return (
    <div className="subnav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/sistema'}
          className={({ isActive }) => `subnav__link${isActive ? ' subnav__link--active' : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
