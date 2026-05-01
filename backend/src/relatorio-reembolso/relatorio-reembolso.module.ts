import { Module } from '@nestjs/common';
import { RelatorioReembolsoService } from './relatorio-reembolso.service';
import { RelatorioReembolsoController } from './relatorio-reembolso.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AutentiqueModule } from '../autentique/autentique.module';

@Module({
  imports: [PrismaModule, StorageModule, AutentiqueModule],
  controllers: [RelatorioReembolsoController],
  providers: [RelatorioReembolsoService],
})
export class RelatorioReembolsoModule {}
