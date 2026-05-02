import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateTarefaDto } from './dto/create-tarefa.dto';
import { AddTarefaComentarioDto } from './dto/add-tarefa-comentario.dto';
import { TarefasService } from './tarefas.service';

@Controller('tarefas')
export class TarefasController {
  constructor(private readonly tarefasService: TarefasService) {}

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get('minhas')
  async minhas(@CurrentUser() user: AuthenticatedUser) {
    return this.tarefasService.findAll(user, { atribuidoA: user.id });
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
  @Put(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.tarefasService.update(user.empresaId, id, body as Partial<CreateTarefaDto>);
  }


  @Post(':id/comentarios')
  async addComentario(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: AddTarefaComentarioDto,
  ) {
    return this.tarefasService.addComentario(user, id, body.mensagem);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tarefasService.remove(user.empresaId, id);
  }
}
