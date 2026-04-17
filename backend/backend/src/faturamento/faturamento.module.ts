import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EnotasService } from './enotas.service';
import { FaturamentoController } from './faturamento.controller';
import { FaturamentoService } from './faturamento.service';

@Module({
  imports: [PrismaModule],
  controllers: [FaturamentoController],
  providers: [FaturamentoService, EnotasService],
  exports: [FaturamentoService],
})
export class FaturamentoModule {}
