import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateProjetoDto } from './dto/create-projeto.dto';
import { ProjetosService } from './projetos.service';

@Controller('projetos')
export class ProjetosController {
  constructor(private readonly projetosService: ProjetosService) {}

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.projetosService.findAll(user);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get('painel-operacional')
  async getPainelOperacional(@CurrentUser() user: AuthenticatedUser) {
    return this.projetosService.getPainelOperacional(user);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projetosService.findOne(user, id);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateProjetoDto,
  ) {
    return this.projetosService.create(user.empresaId, body);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Put(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projetosService.update(user.empresaId, id, body as Partial<CreateProjetoDto>);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projetosService.remove(user.empresaId, id);
  }
}
