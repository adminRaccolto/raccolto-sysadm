import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TiposGastoReembolsoController } from './tipos-gasto-reembolso.controller';
import { TiposGastoReembolsoService } from './tipos-gasto-reembolso.service';

@Module({
  imports: [PrismaModule],
  controllers: [TiposGastoReembolsoController],
  providers: [TiposGastoReembolsoService],
  exports: [TiposGastoReembolsoService],
})
export class TiposGastoReembolsoModule {}
