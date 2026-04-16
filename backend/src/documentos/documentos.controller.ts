import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { StorageService } from '../storage/storage.service';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { DocumentosService } from './documentos.service';

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

@Controller('documentos')
export class DocumentosController {
  private readonly logger = new Logger(DocumentosController.name);

  constructor(
    private readonly documentosService: DocumentosService,
    private readonly storageService: StorageService,
  ) {}

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_SIZE } }))
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo foi enviado.');

    try {
      const url = await this.storageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        'documentos',
      );
      return {
        url,
        originalName: file.originalname,
        mimeType: file.mimetype,
        tamanho: file.size,
        empresaId: user.empresaId,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha no upload de documento: ${msg}`);
      throw new InternalServerErrorException(`Falha no upload: ${msg}`);
    }
  }

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA, PerfilUsuario.CLIENTE)
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projetoId') projetoId?: string,
    @Query('contratoId') contratoId?: string,
    @Query('clienteId') clienteId?: string,
    @Query('tipo') tipo?: string,
    @Query('semVinculo') semVinculo?: string,
  ) {
    return this.documentosService.findAll(user, { projetoId, contratoId, clienteId, tipo, semVinculo: semVinculo === 'true' });
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
