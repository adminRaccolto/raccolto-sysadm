import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UpsertPerfilAcessoDto } from './dto/upsert-perfil-acesso.dto';
import { PerfisAcessoService } from './perfis-acesso.service';

@Roles(PerfilUsuario.ADMIN)
@Controller('perfis-acesso')
export class PerfisAcessoController {
  constructor(private readonly perfisAcessoService: PerfisAcessoService) {}

  @Get('resources')
  async resources() {
    return this.perfisAcessoService.findResources();
  }

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.perfisAcessoService.findAll(user.empresaId);
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: UpsertPerfilAcessoDto) {
    return this.perfisAcessoService.create(user.empresaId, body);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpsertPerfilAcessoDto,
  ) {
    return this.perfisAcessoService.update(user.empresaId, id, body);
  }
}
