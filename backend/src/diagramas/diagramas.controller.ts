import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DiagramasService } from './diagramas.service';
import { CreateDiagramaDto } from './dto/create-diagrama.dto';

@Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
@Controller('diagramas')
export class DiagramasController {
  constructor(private readonly diagramasService: DiagramasService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('projetoId') projetoId?: string) {
    return this.diagramasService.findAll(user.empresaId, projetoId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.diagramasService.findOne(user.empresaId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateDiagramaDto) {
    return this.diagramasService.create(user.empresaId, user.id, body);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: CreateDiagramaDto,
  ) {
    return this.diagramasService.update(user.empresaId, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.diagramasService.remove(user.empresaId, id);
  }
}
