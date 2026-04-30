import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CrmService } from './crm.service';
import { ConvertOportunidadeDto } from './dto/convert-oportunidade.dto';
import { CreateOportunidadeDto } from './dto/create-oportunidade.dto';
import { AddOportunidadeComentarioDto } from './dto/add-oportunidade-comentario.dto';
import { CreateEtapaDto, UpdateEtapaDto } from './dto/create-etapa.dto';

@Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('oportunidades')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('etapa') etapa?: string,
    @Query('responsavelId') responsavelId?: string,
    @Query('produtoServicoId') produtoServicoId?: string,
  ) {
    return this.crmService.findAll(user.empresaId, { etapa, responsavelId, produtoServicoId });
  }

  @Get('etapas')
  async etapas(@CurrentUser() user: AuthenticatedUser) {
    return this.crmService.listEtapas(user.empresaId);
  }

  @Post('etapas')
  async createEtapa(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateEtapaDto) {
    return this.crmService.createEtapa(user.empresaId, body);
  }

  @Put('etapas/:id')
  async updateEtapa(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateEtapaDto) {
    return this.crmService.updateEtapa(user.empresaId, id, body);
  }

  @Delete('etapas/:id')
  async removeEtapa(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.crmService.removeEtapa(user.empresaId, id);
  }


  @Get('oportunidades/:id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.crmService.findOne(user.empresaId, id);
  }

  @Post('oportunidades')
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateOportunidadeDto) {
    return this.crmService.create(user.empresaId, body);
  }

  @Put('oportunidades/:id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.crmService.update(user.empresaId, id, body as Partial<CreateOportunidadeDto>);
  }

  @Delete('oportunidades/:id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.crmService.remove(user.empresaId, id);
  }


  @Post('oportunidades/:id/comentarios')
  async addComentario(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: AddOportunidadeComentarioDto,
  ) {
    return this.crmService.addComentario(user, id, body.mensagem);
  }

  @Post('oportunidades/:id/converter')
  async converter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ConvertOportunidadeDto,
  ) {
    return this.crmService.converter(user.empresaId, id, body);
  }
}
