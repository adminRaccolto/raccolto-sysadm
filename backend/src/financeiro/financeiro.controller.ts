import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname } from 'path';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateContaBancariaDto } from './dto/create-conta-bancaria.dto';
import { CreateContaGerencialDto } from './dto/create-conta-gerencial.dto';
import { CreateContaPagarDto } from './dto/create-conta-pagar.dto';
import { CreateLancamentoTesourariaDto } from './dto/create-lancamento-tesouraria.dto';
import { CreateRecebivelDto } from './dto/create-recebivel.dto';
import { FinanceiroService } from './financeiro.service';

function buildContaPagarStorage() {
  return diskStorage({
    destination: (_req, _file, cb) => {
      const destination = 'uploads/financeiro';
      mkdirSync(destination, { recursive: true });
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      const base = file.originalname
        .replace(/\.[^/.]+$/, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      const extension = extname(file.originalname);
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${base || 'anexo'}-${unique}${extension}`);
    },
  });
}

@Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.financeiroService.getDashboard(user.empresaId);
  }

  @Get('fluxo-caixa')
  getFluxo(@CurrentUser() user: AuthenticatedUser) {
    return this.financeiroService.getFluxoCaixaProjetado(user.empresaId);
  }

  @Get('contas-receber')
  listReceber(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.financeiroService.listRecebiveis(
      user.empresaId,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 100,
    );
  }

  @Post('contas-receber')
  createReceber(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateRecebivelDto) {
    return this.financeiroService.createRecebivel(user.empresaId, body);
  }

  @Put('contas-receber/:id')
  updateReceber(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: Partial<CreateRecebivelDto>) {
    return this.financeiroService.updateRecebivel(user.empresaId, id, body);
  }

  @Delete('contas-receber/:id')
  removeReceber(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.financeiroService.removeRecebivel(user.empresaId, id);
  }

  @Get('contas-pagar')
  listPagar(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.financeiroService.listContasPagar(
      user.empresaId,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 100,
    );
  }

  @Post('contas-pagar')
  createPagar(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateContaPagarDto) {
    return this.financeiroService.createContaPagar(user.empresaId, body);
  }

  @Put('contas-pagar/:id')
  updatePagar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: Partial<CreateContaPagarDto>) {
    return this.financeiroService.updateContaPagar(user.empresaId, id, body);
  }

  @Post('contas-pagar/:id/anexo')
  @UseInterceptors(FileInterceptor('file', { storage: buildContaPagarStorage() }))
  uploadPagarAnexo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo foi enviado.');
    const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.financeiroService.setAnexoContaPagar(user.empresaId, id, `${baseUrl}/uploads/financeiro/${file.filename}`);
  }

  @Delete('contas-pagar/:id')
  removePagar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.financeiroService.removeContaPagar(user.empresaId, id);
  }

  @Get('tesouraria/lancamentos')
  listTesouraria(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.financeiroService.listLancamentosTesouraria(
      user.empresaId,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 100,
    );
  }

  @Post('tesouraria/lancamentos')
  createTesouraria(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateLancamentoTesourariaDto) {
    return this.financeiroService.createLancamentoTesouraria(user.empresaId, body);
  }

  @Delete('tesouraria/lancamentos/:id')
  removeTesouraria(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.financeiroService.removeLancamentoTesouraria(user.empresaId, id);
  }

  @Get('plano-contas')
  listPlano(@CurrentUser() user: AuthenticatedUser) {
    return this.financeiroService.listContasGerenciais(user.empresaId);
  }

  @Get('contas-gerenciais')
  listContasGerenciais(@CurrentUser() user: AuthenticatedUser) {
    return this.financeiroService.listContasGerenciais(user.empresaId);
  }

  @Post('plano-contas')
  createPlano(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateContaGerencialDto) {
    return this.financeiroService.createContaGerencial(user.empresaId, body);
  }

  @Put('plano-contas/:id')
  updatePlano(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: Partial<CreateContaGerencialDto>) {
    return this.financeiroService.updateContaGerencial(user.empresaId, id, body);
  }

  @Delete('plano-contas/:id')
  removePlano(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.financeiroService.removeContaGerencial(user.empresaId, id);
  }

  @Post('plano-contas/seed')
  seedPlano(@CurrentUser() user: AuthenticatedUser) {
    return this.financeiroService.seedPlanoContas(user.empresaId);
  }

  @Get('contas-bancarias')
  listBancos(@CurrentUser() user: AuthenticatedUser) {
    return this.financeiroService.listContasBancarias(user.empresaId);
  }

  @Post('contas-bancarias')
  createBanco(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateContaBancariaDto) {
    return this.financeiroService.createContaBancaria(user.empresaId, body);
  }

  @Put('contas-bancarias/:id')
  updateBanco(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: Partial<CreateContaBancariaDto>) {
    return this.financeiroService.updateContaBancaria(user.empresaId, id, body);
  }

  @Delete('contas-bancarias/:id')
  removeBanco(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.financeiroService.removeContaBancaria(user.empresaId, id);
  }
}
