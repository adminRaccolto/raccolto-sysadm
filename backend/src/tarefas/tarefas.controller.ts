import { Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateTarefaDto } from './dto/create-tarefa.dto';
import { AddTarefaComentarioDto } from './dto/add-tarefa-comentario.dto';
import { TarefasService } from './tarefas.service';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { IsHexColor } from 'class-validator';

class CreateLabelDto {
  @IsString()
  nome!: string;

  @IsOptional()
  @IsString()
  cor?: string;
}

class RegistrarHorasDto {
  @IsNumber()
  @Min(0.1)
  horas!: number;
}

@Controller('tarefas')
export class TarefasController {
  constructor(private readonly tarefasService: TarefasService) {}

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get('minhas')
  async findMinhas(@CurrentUser() user: AuthenticatedUser) {
    return this.tarefasService.findMinhas(user);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get('labels')
  async findLabels(@CurrentUser() user: AuthenticatedUser) {
    return this.tarefasService.findLabels(user.empresaId);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Post('labels')
  async createLabel(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateLabelDto) {
    return this.tarefasService.createLabel(user.empresaId, body.nome, body.cor ?? '#6366f1');
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Put('labels/:labelId')
  async updateLabel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('labelId') labelId: string,
    @Body() body: Partial<CreateLabelDto>,
  ) {
    return this.tarefasService.updateLabel(user.empresaId, labelId, body.nome, body.cor);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Delete('labels/:labelId')
  async removeLabel(@CurrentUser() user: AuthenticatedUser, @Param('labelId') labelId: string) {
    return this.tarefasService.removeLabel(user.empresaId, labelId);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projetoId') projetoId?: string,
    @Query('etapaId') etapaId?: string,
    @Query('status') status?: string,
    @Query('atribuidoA') atribuidoA?: string,
  ) {
    return this.tarefasService.findAll(user, { projetoId, etapaId, status, atribuidoA });
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tarefasService.findOne(user, id);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateTarefaDto) {
    return this.tarefasService.create(user.empresaId, body, user.nome);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Put(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.tarefasService.update(user.empresaId, id, body as Partial<CreateTarefaDto>, user.nome);
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
  @Post(':id/labels/:labelId')
  async adicionarLabel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('labelId') labelId: string,
  ) {
    return this.tarefasService.adicionarLabel(user.empresaId, id, labelId);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Delete(':id/labels/:labelId')
  async removerLabel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('labelId') labelId: string,
  ) {
    return this.tarefasService.removerLabel(user.empresaId, id, labelId);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Post(':id/horas')
  async registrarHoras(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RegistrarHorasDto,
  ) {
    return this.tarefasService.registrarHoras(user.empresaId, id, body.horas);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Post(':id/anexos')
  @UseInterceptors(FileInterceptor('file'))
  async adicionarAnexo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.tarefasService.adicionarAnexo(user, id, file);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Delete(':id/anexos/:anexoId')
  async removerAnexo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('anexoId') anexoId: string,
  ) {
    return this.tarefasService.removerAnexo(user.empresaId, id, anexoId);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tarefasService.remove(user.empresaId, id);
  }
}
