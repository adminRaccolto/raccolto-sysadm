import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ContratosModule } from './contratos/contratos.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmpresasModule } from './empresas/empresas.module';
import { EntregaveisModule } from './entregaveis/entregaveis.module';
import { FinanceiroModule } from './financeiro/financeiro.module';
import { FornecedoresModule } from './fornecedores/fornecedores.module';
import { FuncionariosModule } from './funcionarios/funcionarios.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProdutosModule } from './produtos/produtos.module';
import { ProjetosModule } from './projetos/projetos.module';
import { SuporteModule } from './suporte/suporte.module';
import { TarefasModule } from './tarefas/tarefas.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HealthModule,
    EmpresasModule,
    UsuariosModule,
    ProdutosModule,
    ClientesModule,
    ContratosModule,
    ProjetosModule,
    TarefasModule,
    EntregaveisModule,
    FinanceiroModule,
    DashboardModule,
    SuporteModule,
    FornecedoresModule,
    FuncionariosModule,
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
