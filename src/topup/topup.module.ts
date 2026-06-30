import { Module } from '@nestjs/common';
import { TopupController } from './topup.controller';
import { TopupService } from './topup.service';
import { Slip2goService } from './slip2go.service';

@Module({
    controllers: [TopupController],
    providers: [TopupService, Slip2goService],
    exports: [TopupService],
})
export class TopupModule { }
