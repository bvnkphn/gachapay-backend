import { Module }          from '@nestjs/common';
import { OrdersService }   from './orders.service';
import { OrdersController }from './orders.controller';
import { PaymentModule }   from '../payment/payment.module';
import { TopupModule }     from '../topup/topup.module';
import { CouponsModule }   from '../coupons/coupons.module';

@Module({
  imports:     [PaymentModule, TopupModule, CouponsModule],
  controllers: [OrdersController],
  providers:   [OrdersService],
})
export class OrdersModule {}
