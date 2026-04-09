import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { ProdutosService } from './produtos.service';

@Controller('produtos-servicos')
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.produtosService.findAll(user.empresaId);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateProdutoDto) {
    return this.produtosService.create(user.empresaId, body);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Put(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.produtosService.update(user.empresaId, id, body as Partial<CreateProdutoDto>);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.produtosService.remove(user.empresaId, id);
  }
}
