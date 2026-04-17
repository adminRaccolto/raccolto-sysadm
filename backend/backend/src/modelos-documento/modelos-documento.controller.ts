import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PerfilUsuario, TipoModeloDocumento } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ModelosDocumentoService, UpsertModeloDto } from './modelos-documento.service';

@Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
@Controller('modelos-documento')
export class ModelosDocumentoController {
  constructor(private readonly service: ModelosDocumentoService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('tipo') tipo?: string) {
    return this.service.findAll(user.empresaId, tipo as TipoModeloDocumento | undefined);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user.empresaId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: UpsertModeloDto) {
    return this.service.create(user.empresaId, body);
  }

  @Put(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: Partial<UpsertModeloDto>) {
    return this.service.update(user.empresaId, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user.empresaId, id);
  }
}
