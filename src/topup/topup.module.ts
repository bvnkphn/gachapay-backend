import { Module } from '@nestjs/common';
import { TopupController } from './topup.controller';
import { TopupService } from './topup.service';
import { ApiCreditModule } from '../api-credit/api-credit.module';

@Module({
    imports: [ApiCreditModule],
    controllers: [TopupController],
    providers: [TopupService],
    exports: [TopupService],
})
export class TopupModule { }
