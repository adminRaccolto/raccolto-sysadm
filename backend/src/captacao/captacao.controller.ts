import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CaptacaoService } from './captacao.service';
import { CreateFormularioDto } from './dto/create-formulario.dto';
import { SubmitFormularioDto } from './dto/submit-formulario.dto';

@Controller('captacao')
export class CaptacaoController {
  constructor(private readonly captacaoService: CaptacaoService) {}

  // ── Public routes ──────────────────────────────────────────────────────

  @Public()
  @Get('f/:slug')
  getPublicForm(@Param('slug') slug: string) {
    return this.captacaoService.findBySlug(slug);
  }

  @Public()
  @Post('f/:slug/submit')
  submit(@Param('slug') slug: string, @Body() body: SubmitFormularioDto) {
    return this.captacaoService.submit(slug, body);
  }

  // ── Admin routes ───────────────────────────────────────────────────────

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Get('formularios')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.captacaoService.findAll(user.empresaId);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Get('formularios/:id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.captacaoService.findOne(user.empresaId, id);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Post('formularios')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateFormularioDto) {
    return this.captacaoService.create(user.empresaId, body);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Put('formularios/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Partial<CreateFormularioDto>,
  ) {
    return this.captacaoService.update(user.empresaId, id, body);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Delete('formularios/:id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.captacaoService.remove(user.empresaId, id);
  }
}
