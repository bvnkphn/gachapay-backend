import { Module } from '@nestjs/common';
import { PaymentModule } from '../payments/payment.module';
import { WebhookController } from './webhook.controller';

@Module({
    imports: [PaymentModule],
    controllers: [WebhookController],
})
export class WebhookModule { }
