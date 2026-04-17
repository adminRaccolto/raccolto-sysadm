import { Module } from '@nestjs/common';
import { PerfisAcessoModule } from '../perfis-acesso/perfis-acesso.module';
import { EmpresasController } from './empresas.controller';
import { EmpresasService } from './empresas.service';

@Module({
  imports: [PerfisAcessoModule],
  controllers: [EmpresasController],
  providers: [EmpresasService],
  exports: [EmpresasService],
})
export class EmpresasModule {}
