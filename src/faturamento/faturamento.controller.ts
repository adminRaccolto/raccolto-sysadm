import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { RegistrarPagamentoDto, ReagendarRecebivelDto } from './dto/faturamento.dto';
import { FaturamentoService } from './faturamento.service';

@Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
@Controller('faturamento')
export class FaturamentoController {
  constructor(private readonly service: FaturamentoService) {}

  // Info primeiro dia útil e competência
  @Get('info')
  info(@Query('competencia') competencia?: string) {
    return this.service.infoPrimeiroDiaUtil(competencia);
  }

  // Itens faturáveis do mês (parcelas pendentes)
  @Get('faturavel')
  listarFaturavel(
    @CurrentUser() user: AuthenticatedUser,
    @Query('competencia') competencia?: string,
  ) {
    return this.service.listarFaturaveisMes(user.empresaId, competencia);
  }

  // Faturamentos já emitidos
  @Get()
  listar(
    @CurrentUser() user: AuthenticatedUser,
    @Query('competencia') competencia?: string,
  ) {
    return this.service.listarFaturamentos(user.empresaId, competencia);
  }

  // Faturamento avulso (sem contrato)
  @Post('avulso')
  faturarAvulso(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      clienteId: string;
      descricao: string;
      valor: number;
      vencimento: string;
      competencia?: string;
      observacoes?: string;
    },
  ) {
    return this.service.faturarAvulso(user.empresaId, body);
  }

  // Faturar uma parcela individualmente
  @Post('cobranca/:contratoCobrancaId')
  faturarCobranca(
    @CurrentUser() user: AuthenticatedUser,
    @Param('contratoCobrancaId') contratoCobrancaId: string,
  ) {
    return this.service.faturarCobranca(user.empresaId, contratoCobrancaId);
  }

  // Faturar todos do mês de uma vez
  @Post('faturar-todos')
  faturarTodos(
    @CurrentUser() user: AuthenticatedUser,
    @Query('competencia') competencia?: string,
  ) {
    return this.service.faturarTodosMes(user.empresaId, competencia);
  }

  // Emitir NFS-e para faturamento pendente
  @Post(':id/emitir-nfse')
  emitirNfse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.emitirNfse(id, user.empresaId);
  }

  // Sincronizar status com eNotas
  @Post(':id/sincronizar')
  sincronizar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.sincronizarStatus(user.empresaId, id);
  }

  // Cancelar faturamento / NFS-e
  @Post(':id/cancelar')
  cancelar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.cancelar(user.empresaId, id);
  }

  // ─── Financeiro: pagamento parcial ────────────────────────────────────────

  @Post('recebiveis/:id/pagar')
  registrarPagamento(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RegistrarPagamentoDto & { valorPago: number },
  ) {
    return this.service.registrarPagamento(
      user.empresaId,
      id,
      body.valorPago,
      body.dataPagamento,
    );
  }

  // ─── Financeiro: reagendar parcela ────────────────────────────────────────

  @Post('recebiveis/:id/reagendar')
  reagendar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ReagendarRecebivelDto,
  ) {
    return this.service.reagendarRecebivel(
      user.empresaId,
      id,
      body.novoVencimento,
      body.observacao,
    );
  }

  // ─── Webhook eNotas (público) ─────────────────────────────────────────────

  @Public()
  @Roles()
  @Post('webhook/enotas')
  @HttpCode(200)
  async webhookEnotas(@Body() body: Record<string, unknown>) {
    await this.service.processarWebhookEnotas(body);
    return { ok: true };
  }
}
