import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ContratosModule } from './contratos/contratos.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CrmModule } from './crm/crm.module';
import { EmpresasModule } from './empresas/empresas.module';
import { EntregaveisModule } from './entregaveis/entregaveis.module';
import { FinanceiroModule } from './financeiro/financeiro.module';
import { DocumentosModule } from './documentos/documentos.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { PerfisAcessoModule } from './perfis-acesso/perfis-acesso.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProdutosModule } from './produtos/produtos.module';
import { ProjetosModule } from './projetos/projetos.module';
import { PropostasModule } from './propostas/propostas.module';
import { FaturamentoModule } from './faturamento/faturamento.module';
import { ChecklistDiagnosticoModule } from './checklist-diagnostico/checklist-diagnostico.module';
import { SuporteModule } from './suporte/suporte.module';
import { CaptacaoModule } from './captacao/captacao.module';
import { ModelosDocumentoModule } from './modelos-documento/modelos-documento.module';
import { DeslocamentosModule } from './deslocamentos/deslocamentos.module';
import { BancosModule } from './bancos/bancos.module';
import { FuncionariosModule } from './funcionarios/funcionarios.module';
import { FornecedoresModule } from './fornecedores/fornecedores.module';
import { TarefasModule } from './tarefas/tarefas.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    StorageModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    EmpresasModule,
    UsuariosModule,
    ProdutosModule,
    ClientesModule,
    ContratosModule,
    PropostasModule,
    ProjetosModule,
    TarefasModule,
    EntregaveisModule,
    DocumentosModule,
    NotificacoesModule,
    PerfisAcessoModule,
    FinanceiroModule,
    DashboardModule,
    CrmModule,
    SuporteModule,
    FaturamentoModule,
    ChecklistDiagnosticoModule,
    CaptacaoModule,
    ModelosDocumentoModule,
    DeslocamentosModule,
    BancosModule,
    FuncionariosModule,
    FornecedoresModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
