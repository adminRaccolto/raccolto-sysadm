import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PerfilUsuario } from '@prisma/client';
import {
  RelatorioReembolsoService,
  CreateRelatorioDto,
  GerarFinanceiroDto,
} from './relatorio-reembolso.service';

@Controller('relatorios-reembolso')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
export class RelatorioReembolsoController {
  constructor(private readonly service: RelatorioReembolsoService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.empresaId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user.empresaId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRelatorioDto) {
    return this.service.create(user.empresaId, dto);
  }

  @Put(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: Partial<CreateRelatorioDto>) {
    return this.service.update(user.empresaId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user.empresaId, id);
  }

  @Post(':id/gerar-documento')
  gerarDocumento(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.gerarDocumento(user.empresaId, id);
  }

  @Post(':id/enviar-aprovacao')
  enviarParaAprovacao(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { signatarioNome: string; signatarioEmail: string },
  ) {
    return this.service.enviarParaAprovacao(user.empresaId, id, body.signatarioNome, body.signatarioEmail);
  }

  @Post(':id/sincronizar')
  sincronizar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.sincronizarAprovacao(user.empresaId, id);
  }

  @Post(':id/gerar-financeiro')
  gerarFinanceiro(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: GerarFinanceiroDto,
  ) {
    return this.service.gerarFinanceiro(user.empresaId, id, dto);
  }
}
