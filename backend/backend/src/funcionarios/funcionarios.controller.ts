import { Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateFuncionarioDto, FuncionariosService } from './funcionarios.service';

@Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
@Controller('funcionarios')
export class FuncionariosController {
  constructor(private readonly service: FuncionariosService) {}

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
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateFuncionarioDto) {
    return this.service.create(user.empresaId, body);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Partial<CreateFuncionarioDto>,
  ) {
    return this.service.update(user.empresaId, id, body);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Post(':id/foto')
  @UseInterceptors(FileInterceptor('file'))
  uploadFoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadFoto(user.empresaId, id, file);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user.empresaId, id);
  }
}
