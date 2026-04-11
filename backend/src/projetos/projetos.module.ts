import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjetosController } from './projetos.controller';
import { ProjetosService } from './projetos.service';
import { EtapasController } from './etapas.controller';
import { EtapasService } from './etapas.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProjetosController, EtapasController],
  providers: [ProjetosService, EtapasService],
  exports: [ProjetosService, EtapasService],
})
export class ProjetosModule {}
