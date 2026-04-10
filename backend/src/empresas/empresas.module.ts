import { Module } from '@nestjs/common';
import { PerfisAcessoModule } from '../perfis-acesso/perfis-acesso.module';
import { StorageModule } from '../storage/storage.module';
import { EmpresasController } from './empresas.controller';
import { EmpresasService } from './empresas.service';

@Module({
  imports: [PerfisAcessoModule, StorageModule],
  controllers: [EmpresasController],
  providers: [EmpresasService],
  exports: [EmpresasService],
})
export class EmpresasModule {}
