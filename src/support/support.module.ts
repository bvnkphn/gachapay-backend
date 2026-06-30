import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportUserController } from './support-user.controller';
import { SupportService } from './support.service';

@Module({
  controllers: [SupportController, SupportUserController],
  providers:   [SupportService],
  exports:     [SupportService],
})
export class SupportModule {}
