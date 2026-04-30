import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DiagnosticoLeadService } from './diagnostico-lead.service';
import { CreateDiagnosticoLeadDto } from './dto/create-diagnostico-lead.dto';

@Controller('diagnostico-lead')
export class DiagnosticoLeadController {
  constructor(private readonly service: DiagnosticoLeadService) {}

  // ── Rota pública — lead preenche o hotsite ──────────────────────────────

  @Public()
  @Post('publico/:empresaId')
  create(@Param('empresaId') empresaId: string, @Body() dto: CreateDiagnosticoLeadDto) {
    return this.service.create(empresaId, dto);
  }

  // ── Rotas internas — time de qualificação ──────────────────────────────

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.empresaId);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user.empresaId, id);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Patch(':id/qualificar')
  qualificar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.updateStatus(user.empresaId, id, 'QUALIFICADO');
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Patch(':id/desqualificar')
  desqualificar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.updateStatus(user.empresaId, id, 'NAO_QUALIFICADO');
  }
}
