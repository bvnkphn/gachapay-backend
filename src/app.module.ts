import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { GamesModule } from './games/games.module';
import { CategoriesModule } from './categories/categories.module';
import { BannersModule } from './banners/banners.module';
import { WalletsModule } from './wallets/wallets.module';
<<<<<<< Updated upstream
import { CouponsModule } from './coupons/coupons.module';
=======
import { TopupModule } from './topup/topup.module';
>>>>>>> Stashed changes

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        PrismaModule,
        AuthModule,
        UsersModule,
        OrdersModule,
        GamesModule,
        CategoriesModule,
        BannersModule,
        WalletsModule,
<<<<<<< Updated upstream
        CouponsModule,
=======
        TopupModule,
>>>>>>> Stashed changes
    ],
})
export class AppModule { }
