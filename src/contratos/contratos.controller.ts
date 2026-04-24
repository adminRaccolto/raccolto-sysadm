import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ContratosService } from './contratos.service';
import { CreateContratoDto } from './dto/create-contrato.dto';

@Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
@Controller('contratos')
export class ContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.contratosService.findAll(user.empresaId);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contratosService.findOne(user.empresaId, id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateContratoDto,
  ) {
    return this.contratosService.create(user.empresaId, body);
  }
}
