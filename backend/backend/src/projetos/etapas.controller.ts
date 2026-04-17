import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { PerfilUsuario } from '@prisma/client';
import { EtapasService } from './etapas.service';
import { CreateEtapaDto } from './dto/create-etapa.dto';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Controller('projetos/:projetoId/etapas')
export class EtapasController {
  constructor(private readonly etapasService: EtapasService) {}

  @Get()
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  findAll(@Req() req: { user: AuthenticatedUser }, @Param('projetoId') projetoId: string) {
    return this.etapasService.findAll(req.user.empresaId, projetoId);
  }

  @Post()
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  create(
    @Req() req: { user: AuthenticatedUser },
    @Param('projetoId') projetoId: string,
    @Body() dto: CreateEtapaDto,
  ) {
    return this.etapasService.create(req.user.empresaId, projetoId, dto);
  }

  @Put(':etapaId')
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  update(
    @Req() req: { user: AuthenticatedUser },
    @Param('projetoId') projetoId: string,
    @Param('etapaId') etapaId: string,
    @Body() dto: Partial<CreateEtapaDto>,
  ) {
    return this.etapasService.update(req.user.empresaId, projetoId, etapaId, dto);
  }

  @Delete(':etapaId')
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  remove(
    @Req() req: { user: AuthenticatedUser },
    @Param('projetoId') projetoId: string,
    @Param('etapaId') etapaId: string,
  ) {
    return this.etapasService.remove(req.user.empresaId, projetoId, etapaId);
  }

  @Post(':etapaId/iniciar')
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  iniciar(
    @Req() req: { user: AuthenticatedUser },
    @Param('projetoId') projetoId: string,
    @Param('etapaId') etapaId: string,
  ) {
    return this.etapasService.iniciar(req.user.empresaId, projetoId, etapaId);
  }

  @Post(':etapaId/concluir')
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  concluir(
    @Req() req: { user: AuthenticatedUser },
    @Param('projetoId') projetoId: string,
    @Param('etapaId') etapaId: string,
  ) {
    return this.etapasService.concluir(req.user.empresaId, projetoId, etapaId);
  }
}
