import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiagramasController } from './diagramas.controller';
import { DiagramasService } from './diagramas.service';

@Module({
  imports: [PrismaModule],
  controllers: [DiagramasController],
  providers: [DiagramasService],
})
export class DiagramasModule {}
