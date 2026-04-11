import { NavLink } from 'react-router-dom';

const items = [
  { to: '/sistema', label: 'Empresa' },
  { to: '/sistema/bancos', label: 'Bancos' },
  { to: '/sistema/contas', label: 'Contas' },
  { to: '/sistema/funcionarios', label: 'Funcionários' },
  { to: '/sistema/fornecedores', label: 'Fornecedores' },
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
          end
          className={({ isActive }) => `subnav__link${isActive ? ' subnav__link--active' : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
