import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiagnosticoLeadController } from './diagnostico-lead.controller';
import { DiagnosticoLeadService } from './diagnostico-lead.service';

@Module({
  imports: [PrismaModule],
  controllers: [DiagnosticoLeadController],
  providers: [DiagnosticoLeadService],
})
export class DiagnosticoLeadModule {}
