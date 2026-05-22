import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CentrosCustoController } from './centro-custos.controller';
import { CentrosCustoService } from './centro-custos.service';

@Module({
  imports: [PrismaModule],
  controllers: [CentrosCustoController],
  providers: [CentrosCustoService],
  exports: [CentrosCustoService],
})
export class CentrosCustoModule {}
