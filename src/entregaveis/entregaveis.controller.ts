import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateEntregavelDto } from './dto/create-entregavel.dto';
import { EntregaveisService } from './entregaveis.service';

@Controller('entregaveis')
export class EntregaveisController {
  constructor(private readonly entregaveisService: EntregaveisService) {}

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projetoId') projetoId?: string,
  ) {
    return this.entregaveisService.findAll(user, projetoId);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.entregaveisService.findOne(user, id);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateEntregavelDto,
  ) {
    return this.entregaveisService.create(user.empresaId, body);
  }
}
