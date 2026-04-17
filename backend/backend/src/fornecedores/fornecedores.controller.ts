import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateFornecedorDto, FornecedoresService } from './fornecedores.service';

@Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
@Controller('fornecedores')
export class FornecedoresController {
  constructor(private readonly service: FornecedoresService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('ativos') ativos?: string) {
    return this.service.findAll(user.empresaId, ativos === 'true');
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user.empresaId, id);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateFornecedorDto) {
    return this.service.create(user.empresaId, body);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Partial<CreateFornecedorDto>,
  ) {
    return this.service.update(user.empresaId, id, body);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user.empresaId, id);
  }
}
