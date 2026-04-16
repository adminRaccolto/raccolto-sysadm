import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateDeslocamentoDto, DeslocamentosService, GerarRelatorioDto } from './deslocamentos.service';

@Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
@Controller('deslocamentos')
export class DeslocamentosController {
  constructor(private readonly service: DeslocamentosService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('projetoId') projetoId?: string) {
    return this.service.findAll(user.empresaId, projetoId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user.empresaId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateDeslocamentoDto) {
    return this.service.create(user.empresaId, body);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Partial<CreateDeslocamentoDto> & { reembolsado?: boolean },
  ) {
    return this.service.update(user.empresaId, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user.empresaId, id);
  }

  // ─── RELATÓRIO ──────────────────────────────────────────────────────────

  @Post('relatorio/gerar')
  gerarRelatorio(@CurrentUser() user: AuthenticatedUser, @Body() body: GerarRelatorioDto) {
    return this.service.gerarRelatorio(user.empresaId, user.id, body);
  }

  @Post('relatorio/:documentoId/assinar')
  enviarAssinatura(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentoId') documentoId: string,
    @Body() body: { signatarioNome: string; signatarioEmail: string },
  ) {
    return this.service.enviarParaAssinatura(user.empresaId, documentoId, body.signatarioNome, body.signatarioEmail);
  }

  @Post('relatorio/:documentoId/sincronizar')
  sincronizar(@CurrentUser() user: AuthenticatedUser, @Param('documentoId') documentoId: string) {
    return this.service.sincronizarAssinatura(user.empresaId, documentoId);
  }
}
