import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedLayout from '../layout/ProtectedLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ClientesPage from '../pages/ClientesPage';
import ContratosPage from '../pages/ContratosPage';
import PropostasPage from '../pages/PropostasPage';
import PropostaPreviewPage from '../pages/PropostaPreviewPage';
import FaturamentoPage from '../pages/FaturamentoPage';
import ProjetosPage from '../pages/ProjetosPage';
import SistemaPage from '../pages/SistemaPage';
import ProdutosPage from '../pages/ProdutosPage';
import FinanceiroPage from '../pages/FinanceiroPage';
import CrmPage from '../pages/CrmPage';
import FormulariosCaptacaoPage from '../pages/FormulariosCaptacaoPage';
import CaptacaoPublicPage from '../pages/CaptacaoPublicPage';
import ContasReceberPage from '../pages/financeiro/ContasReceberPage';
import ContasPagarPage from '../pages/financeiro/ContasPagarPage';
import TesourariaPage from '../pages/financeiro/TesourariaPage';
import PlanoContasPage from '../pages/financeiro/PlanoContasPage';
import ProjetoWorkspacePage from '../pages/ProjetoWorkspacePage';
import MinhasTarefasPage from '../pages/projetos/MinhasTarefasPage';
import TaskDetailPage from '../pages/TaskDetailPage';
import EmpresasPage from '../pages/EmpresasPage';
import UsuariosPage from '../pages/UsuariosPage';
import PerfisAcessoPage from '../pages/PerfisAcessoPage';
import BiPage from '../pages/BiPage';
import LearningPage from '../pages/LearningPage';
import ModelosPage from '../pages/ModelosPage';
import DeslocamentosPage from '../pages/DeslocamentosPage';
import RepositorioPage from '../pages/RepositorioPage';
import ChecklistDiagnosticoPage from '../pages/ChecklistDiagnosticoPage';
import BancosPage from '../pages/sistema/BancosPage';
import ContasBancariasPage from '../pages/sistema/ContasBancariasPage';
import FuncionariosPage from '../pages/sistema/FuncionariosPage';
import FornecedoresPage from '../pages/sistema/FornecedoresPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/captacao/:slug" element={<CaptacaoPublicPage />} />
      <Route path="propostas/:id/preview" element={<ProtectedRoute><PropostaPreviewPage /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><ProtectedLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="clientes/:clienteId/checklist" element={<ChecklistDiagnosticoPage />} />
        <Route path="produtos-servicos" element={<ProdutosPage />} />
        <Route path="propostas" element={<PropostasPage />} />
        <Route path="faturamento" element={<FaturamentoPage />} />
        <Route path="contratos" element={<ContratosPage />} />
        <Route path="projetos" element={<ProjetosPage />} />
        <Route path="projetos/minhas-tarefas" element={<MinhasTarefasPage />} />
        <Route path="projetos/:id" element={<ProjetoWorkspacePage />} />
        <Route path="projetos/:id/tarefas/:tarefaId" element={<TaskDetailPage />} />
        <Route path="financeiro" element={<FinanceiroPage />} />
        <Route path="crm" element={<CrmPage />} />
        <Route path="captacao" element={<FormulariosCaptacaoPage />} />
        <Route path="modelos" element={<ModelosPage />} />
        <Route path="deslocamentos" element={<DeslocamentosPage />} />
        <Route path="repositorio" element={<RepositorioPage />} />
        <Route path="financeiro/receber" element={<ContasReceberPage />} />
        <Route path="financeiro/pagar" element={<ContasPagarPage />} />
        <Route path="financeiro/tesouraria" element={<TesourariaPage />} />
        <Route path="financeiro/plano-contas" element={<PlanoContasPage />} />
        <Route path="empresas" element={<EmpresasPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="perfis-acesso" element={<PerfisAcessoPage />} />
        <Route path="sistema" element={<SistemaPage />} />
        <Route path="sistema/bancos" element={<BancosPage />} />
        <Route path="sistema/contas" element={<ContasBancariasPage />} />
        <Route path="sistema/funcionarios" element={<FuncionariosPage />} />
        <Route path="sistema/fornecedores" element={<FornecedoresPage />} />
        <Route path="bi" element={<BiPage />} />
        <Route path="aprendizado" element={<LearningPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
