import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateTipoGastoDto } from './dto/create-tipo-gasto.dto';
import { TiposGastoReembolsoService } from './tipos-gasto-reembolso.service';

@Controller('tipos-gasto-reembolso')
export class TiposGastoReembolsoController {
  constructor(private readonly service: TiposGastoReembolsoService) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('todos') todos?: string,
  ) {
    if (todos === 'true') return this.service.findAllIncludingInactive(user.empresaId);
    return this.service.findAll(user.empresaId);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateTipoGastoDto) {
    return this.service.create(user.empresaId, body);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Put(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: CreateTipoGastoDto,
  ) {
    return this.service.update(id, user.empresaId, body);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(id, user.empresaId);
  }
}
