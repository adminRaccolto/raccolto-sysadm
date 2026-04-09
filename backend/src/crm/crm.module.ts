import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

@Module({
  imports: [NotificacoesModule],
  controllers: [CrmController],
  providers: [CrmService],
})
export class CrmModule {}
