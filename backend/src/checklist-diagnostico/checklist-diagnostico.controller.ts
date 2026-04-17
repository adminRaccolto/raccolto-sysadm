import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ChecklistDiagnosticoService } from './checklist-diagnostico.service';
import { UpsertChecklistDto } from './dto/upsert-checklist.dto';

@Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
@Controller('checklist-diagnostico')
export class ChecklistDiagnosticoController {
  constructor(private readonly service: ChecklistDiagnosticoService) {}

  @Get(':clienteId')
  findByCliente(@CurrentUser() user: AuthenticatedUser, @Param('clienteId') clienteId: string) {
    return this.service.findByCliente(user.empresaId, clienteId);
  }

  @Post(':clienteId')
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('clienteId') clienteId: string,
    @Body() dto: UpsertChecklistDto,
  ) {
    return this.service.upsert(user.empresaId, clienteId, dto);
  }
}
