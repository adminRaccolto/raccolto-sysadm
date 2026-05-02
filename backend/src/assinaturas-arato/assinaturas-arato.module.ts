import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AssinaturasAratoController } from './assinaturas-arato.controller';
import { AssinaturasAratoService } from './assinaturas-arato.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [AssinaturasAratoController],
  providers: [AssinaturasAratoService],
})
export class AssinaturasAratoModule {}
