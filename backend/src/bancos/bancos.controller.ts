import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { BancosService, CreateBancoDto } from './bancos.service';

@Controller('bancos')
export class BancosController {
  constructor(private readonly service: BancosService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(PerfilUsuario.ADMIN)
  @Post()
  create(@Body() body: CreateBancoDto) {
    return this.service.create(body);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<CreateBancoDto>) {
    return this.service.update(id, body);
  }

  @Roles(PerfilUsuario.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
