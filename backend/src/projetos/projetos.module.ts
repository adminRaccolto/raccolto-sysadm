import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjetosController } from './projetos.controller';
import { ProjetosService } from './projetos.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProjetosController],
  providers: [ProjetosService],
  exports: [ProjetosService],
})
export class ProjetosModule {}
