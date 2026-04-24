import { Body, Controller, Get, Post } from '@nestjs/common';
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
}
