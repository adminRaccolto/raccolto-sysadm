import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreatePropostaDto } from './dto/create-proposta.dto';
import { PropostasService } from './propostas.service';

@Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
@Controller('propostas')
export class PropostasController {
  constructor(private readonly propostasService: PropostasService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.propostasService.findAll(user.empresaId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.propostasService.findOne(user.empresaId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreatePropostaDto) {
    return this.propostasService.create(user.empresaId, body);
  }

  @Put(':id')
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.propostasService.update(user.empresaId, id, body as Partial<CreatePropostaDto>);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.propostasService.remove(user.empresaId, id);
  }

  @Post(':id/sincronizar')
  sincronizar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.propostasService.sincronizarStatus(user.empresaId, id);
  }

  @Post(':id/enviar-assinatura')
  async enviarAssinatura(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.propostasService.enviarParaAssinatura(user.empresaId, id);
    return { message: 'Proposta enviada para assinatura digital com sucesso.' };
  }

  @Public()
  @Roles()
  @Post('webhook/autentique')
  @HttpCode(200)
  async webhookAutentique(@Body() body: Record<string, unknown>) {
    await this.propostasService.processarWebhookAutentique(body);
    return { ok: true };
  }
}
