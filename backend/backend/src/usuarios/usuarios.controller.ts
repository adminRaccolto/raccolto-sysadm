import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuariosService } from './usuarios.service';

@Roles(PerfilUsuario.ADMIN)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.usuariosService.findAll(user.empresaId);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateUsuarioDto,
  ) {
    return this.usuariosService.create(user.empresaId, body);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(user.empresaId, id, body);
  }
}
