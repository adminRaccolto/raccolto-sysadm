import { Body, Controller, Get, Post } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { EmpresasService } from './empresas.service';

@Roles(PerfilUsuario.ADMIN)
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Get()
  async findAll() {
    return this.empresasService.findAll();
  }

  @Post()
  async create(@Body() body: CreateEmpresaDto) {
    return this.empresasService.create(body);
  }
}
