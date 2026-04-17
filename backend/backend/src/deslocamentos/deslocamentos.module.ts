import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AutentiqueModule } from '../autentique/autentique.module';
import { DeslocamentosController } from './deslocamentos.controller';
import { DeslocamentosService } from './deslocamentos.service';

@Module({
  imports: [PrismaModule, StorageModule, AutentiqueModule],
  controllers: [DeslocamentosController],
  providers: [DeslocamentosService],
  exports: [DeslocamentosService],
})
export class DeslocamentosModule {}
