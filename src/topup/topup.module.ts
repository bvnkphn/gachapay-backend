import { Module } from '@nestjs/common';
import { TopupController } from './topup.controller';
import { TopupService } from './topup.service';
import { ApiCreditModule } from '../api-credit/api-credit.module';
import { Slip2goService } from './slip2go.service';

@Module({
    imports: [ApiCreditModule],
    controllers: [TopupController],
    providers: [TopupService, Slip2goService],
    exports: [TopupService],
})
export class TopupModule { }
