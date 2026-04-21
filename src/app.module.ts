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
import { CouponsModule } from './coupons/coupons.module';
import { TopupModule } from './topup/topup.module';

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
        CouponsModule,
        TopupModule,
    ],
})
export class AppModule { }
