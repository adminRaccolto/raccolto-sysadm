import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Res } from '@nestjs/common';
import { Response } from 'express';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ContratosService } from './contratos.service';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpsertContratoModeloDto } from './dto/upsert-contrato-modelo.dto';

@Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
@Controller('contratos')
export class ContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  @Get('modelos')
  async listModelos(@CurrentUser() user: AuthenticatedUser) {
    return this.contratosService.listModelos(user.empresaId);
  }

  @Post('modelos')
  async createModelo(@CurrentUser() user: AuthenticatedUser, @Body() body: UpsertContratoModeloDto) {
    return this.contratosService.createModelo(user.empresaId, body);
  }

  @Put('modelos/:id')
  async updateModelo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Partial<UpsertContratoModeloDto>,
  ) {
    return this.contratosService.updateModelo(user.empresaId, id, body);
  }

  @Delete('modelos/:id')
  async removeModelo(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contratosService.removeModelo(user.empresaId, id);
  }

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.contratosService.findAll(user.empresaId);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contratosService.findOne(user.empresaId, id);
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateContratoDto) {
    return this.contratosService.create(user.empresaId, body);
  }

  @Post(':id/enviar-assinatura')
  async enviarAssinatura(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.contratosService.enviarParaAssinatura(user.empresaId, id);
    return { message: 'Contrato enviado para assinatura digital com sucesso.' };
  }

  @Post(':id/reenviar-autentique')
  async reenviarAutentique(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.contratosService.reenviarAutentique(user.empresaId, id);
    return { message: 'Contrato reenviado ao Autentique com sucesso.' };
  }

  @Post(':id/reenviar-link')
  reenviarLink(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contratosService.reenviarLink(user.empresaId, id);
  }

  @Get(':id/pdf')
  async gerarPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, titulo } = await this.contratosService.gerarPdfBuffer(user.empresaId, id);
    const safe = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9-_]/g, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safe}.pdf"`);
    res.send(buffer);
  }

  @Post(':id/assinar-empresa')
  assinarEmpresa(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contratosService.assinarEmpresa(user.empresaId, id);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.contratosService.update(user.empresaId, id, body as Partial<CreateContratoDto>);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contratosService.remove(user.empresaId, id);
  }

  // Webhook público — chamado pelo Autentique quando o documento é assinado
  @Public()
  @Roles()
  @Post('webhook/autentique')
  @HttpCode(200)
  async webhookAutentique(@Body() body: Record<string, unknown>) {
    await this.contratosService.processarWebhookAutentique(body);
    return { ok: true };
  }
}
