import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { DocumentosService } from './documentos.service';

function buildStorage() {
  return diskStorage({
    destination: (_req, _file, cb) => {
      const destination = 'uploads/documentos';
      mkdirSync(destination, { recursive: true });
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      const safeBaseName = file.originalname
        .replace(/\.[^/.]+$/, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      const extension = extname(file.originalname);
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${safeBaseName || 'arquivo'}-${unique}${extension}`);
    },
  });
}

@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: buildStorage() }))
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }

    const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return {
      empresaId: user.empresaId,
      fileName: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      url: `${baseUrl}/uploads/documentos/${file.filename}`,
    };
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projetoId') projetoId?: string,
    @Query('contratoId') contratoId?: string,
    @Query('tipo') tipo?: string,
  ) {
    return this.documentosService.findAll(user, { projetoId, contratoId, tipo });
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documentosService.findOne(user, id);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateDocumentoDto) {
    return this.documentosService.create(user.empresaId, body);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Put(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.documentosService.update(user.empresaId, id, body as Partial<CreateDocumentoDto>);
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documentosService.remove(user.empresaId, id);
  }
}
