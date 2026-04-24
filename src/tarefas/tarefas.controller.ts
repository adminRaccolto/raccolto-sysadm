import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateTarefaDto } from './dto/create-tarefa.dto';
import { TarefasService } from './tarefas.service';

@Controller('tarefas')
export class TarefasController {
  constructor(private readonly tarefasService: TarefasService) {}

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get('minhas')
  async findMinhas(@CurrentUser() user: AuthenticatedUser) {
    return this.tarefasService.findMinhas(user);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projetoId') projetoId?: string,
    @Query('status') status?: string,
    @Query('atribuidoA') atribuidoA?: string,
  ) {
    return this.tarefasService.findAll(user, { projetoId, status, atribuidoA });
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tarefasService.findOne(user, id);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateTarefaDto,
  ) {
    return this.tarefasService.create(user.empresaId, body);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Partial<CreateTarefaDto>,
  ) {
    return this.tarefasService.update(user, id, body);
  }
}
