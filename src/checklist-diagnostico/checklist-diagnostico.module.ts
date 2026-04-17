import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChecklistDiagnosticoController } from './checklist-diagnostico.controller';
import { ChecklistDiagnosticoService } from './checklist-diagnostico.service';

@Module({
  imports: [PrismaModule],
  controllers: [ChecklistDiagnosticoController],
  providers: [ChecklistDiagnosticoService],
})
export class ChecklistDiagnosticoModule {}
