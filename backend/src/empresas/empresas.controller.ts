import { Body, Controller, Get, Logger, Post, Put, UploadedFile, UseInterceptors, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { EmpresasService } from './empresas.service';
import { StorageService } from '../storage/storage.service';

@Controller('empresas')
export class EmpresasController {
  private readonly logger = new Logger(EmpresasController.name);

  constructor(
    private readonly empresasService: EmpresasService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.empresasService.findAllForUser(user.id);
  }

  @Get('me')
  async findCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.empresasService.findCurrent(user.empresaId);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Put('me')
  async updateCurrent(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateEmpresaDto) {
    return this.empresasService.updateCurrent(user.empresaId, body);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Post('me/logo')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadLogo(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo de logo foi enviado.');

    try {
      const url = await this.storageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        'branding',
      );
      return this.empresasService.updateCurrentLogo(user.empresaId, url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha no upload de logo: ${msg}`);
      throw new InternalServerErrorException(`Falha no upload: ${msg}`);
    }
  }

  @Roles(PerfilUsuario.ADMIN)
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateEmpresaDto) {
    return this.empresasService.create(body, user.id);
  }
}
