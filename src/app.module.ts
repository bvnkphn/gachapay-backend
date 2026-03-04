import { Module }           from '@nestjs/common';
import { ConfigModule }     from '@nestjs/config';
import { ThrottlerModule }  from '@nestjs/throttler';
import { PrismaModule }     from './prisma/prisma.module';
import { GamesModule }      from './games/games.module';
import { CouponsModule }    from './coupons/coupons.module';
import { TopupModule }      from './topup/topup.module';
import { PaymentModule }    from './payment/payment.module';
import { OrdersModule }     from './orders/orders.module';
import { GamesAdminModule } from './games-admin/games-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    GamesModule,
    CouponsModule,
    TopupModule,
    PaymentModule,
    OrdersModule,
    GamesAdminModule,
  ],
})
export class AppModule {}
