import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ChecklistDiagnosticoService } from './checklist-diagnostico.service';
import { UpsertChecklistDto } from './dto/upsert-checklist.dto';

@Controller('checklist-diagnostico')
export class ChecklistDiagnosticoController {
  constructor(private readonly service: ChecklistDiagnosticoService) {}

  // ── Rotas públicas (cliente preenche) ───────────────────────────
  @Public()
  @Get('publico/:token')
  findPublico(@Param('token') token: string) {
    return this.service.findByToken(token);
  }

  @Public()
  @Post('publico/:token/responder')
  responderPublico(@Param('token') token: string, @Body() dto: UpsertChecklistDto) {
    return this.service.responderPublico(token, dto);
  }

  // ── Rotas internas (autenticadas, por projeto) ──────────────────
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Get('projeto/:projetoId')
  findByProjeto(@CurrentUser() user: AuthenticatedUser, @Param('projetoId') projetoId: string) {
    return this.service.findByProjeto(user.empresaId, projetoId);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Post('projeto/:projetoId/criar')
  criarOuObter(@CurrentUser() user: AuthenticatedUser, @Param('projetoId') projetoId: string) {
    return this.service.criarOuObter(user.empresaId, projetoId);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Post('projeto/:projetoId/enviar')
  marcarEnviado(@CurrentUser() user: AuthenticatedUser, @Param('projetoId') projetoId: string) {
    return this.service.marcarEnviado(user.empresaId, projetoId);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Put('projeto/:projetoId')
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projetoId') projetoId: string,
    @Body() dto: UpsertChecklistDto,
  ) {
    return this.service.upsertInterno(user.empresaId, projetoId, dto);
  }
}
