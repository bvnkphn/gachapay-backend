import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiCreditController } from './api-credit.controller';
import { ApiCreditService } from './api-credit.service';

@Module({
  imports: [PrismaModule],
  controllers: [ApiCreditController],
  providers: [ApiCreditService],
  exports: [ApiCreditService],
})
export class ApiCreditModule {}
