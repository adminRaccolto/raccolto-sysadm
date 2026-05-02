import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AssinaturasAratoService } from './assinaturas-arato.service';
import { CreateAssinaturaAratoDto } from './dto/create-assinatura-arato.dto';
import { PagarParcelaDto } from './dto/pagar-parcela.dto';

@Controller('assinaturas-arato')
export class AssinaturasAratoController {
  constructor(private readonly service: AssinaturasAratoService) {}

  @Post()
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateAssinaturaAratoDto) {
    return this.service.create(u.empresaId, dto);
  }

  @Get()
  findAll(@CurrentUser() u: AuthenticatedUser) {
    return this.service.findAll(u.empresaId);
  }

  @Get(':id')
  findOne(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(u.empresaId, id);
  }

  @Post('parcela/:recebivelId/pagar')
  pagarParcela(
    @CurrentUser() u: AuthenticatedUser,
    @Param('recebivelId') recebivelId: string,
    @Body() dto: PagarParcelaDto,
  ) {
    return this.service.pagarParcela(u.empresaId, recebivelId, dto);
  }

  @Post(':id/enviar-aviso')
  enviarAviso(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.service.enviarAviso(u.empresaId, id);
  }

  @Post(':id/suspender')
  suspender(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.service.suspender(u.empresaId, id);
  }

  @Post(':id/reativar')
  reativar(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.service.reativar(u.empresaId, id);
  }
}
