import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MODULES = [
  { to: '/clientes',         icon: '◉', label: 'Clientes',           desc: 'Base de clientes e contatos' },
  { to: '/propostas',        icon: '◧', label: 'Propostas',          desc: 'Propostas comerciais com assinatura digital' },
  { to: '/contratos',        icon: '✎', label: 'Contratos',          desc: 'Gestão de contratos e grade de cobrança' },
  { to: '/projetos',         icon: '▤', label: 'Projetos',           desc: 'Projetos, tarefas e entregáveis' },
  { to: '/faturamento',      icon: '◑', label: 'Faturamento',        desc: 'Emissão de NFS-e e faturamento mensal' },
  { to: '/financeiro',       icon: '◈', label: 'Financeiro',         desc: 'Fluxo de caixa, recebíveis e pagamentos' },
  { to: '/crm',              icon: '◎', label: 'CRM',                desc: 'Pipeline de oportunidades' },
  { to: '/bi',               icon: '▦', label: 'BI',                 desc: 'Indicadores e análises gerenciais' },
];

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dataExtenso() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const nome = user?.nome?.split(' ')[0] || 'usuário';
  const empresa = user?.empresa;

  return (
    <div className="home-shell">
      {/* Header de boas-vindas */}
      <div className="home-hero">
        <div className="home-hero__brand">
          {empresa?.logoUrl ? (
            <img src={empresa.logoUrl} alt={empresa.nomeFantasia || empresa.nome} className="home-hero__logo" />
          ) : (
            <div className="home-hero__logo-placeholder">
              {(empresa?.nomeFantasia || empresa?.nome || 'R').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="home-hero__empresa">{empresa?.nomeFantasia || empresa?.nome || 'Raccolto'}</h1>
            <p className="home-hero__date">{dataExtenso()}</p>
          </div>
        </div>
        <p className="home-hero__greeting">
          {saudacao()}, <strong>{nome}</strong>.
        </p>
      </div>

      {/* Grade de módulos */}
      <div className="home-modules">
        {MODULES.map((m) => (
          <Link key={m.to} to={m.to} className="home-module-card">
            <span className="home-module-card__icon">{m.icon}</span>
            <div>
              <strong className="home-module-card__label">{m.label}</strong>
              <span className="home-module-card__desc">{m.desc}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
