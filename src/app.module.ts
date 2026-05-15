import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
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
import { PaymentModule } from './payments/payment.module';
import { WebhookModule } from './webhooks/webhook.module';
import { UploadModule } from './upload/upload.module';
import { PackagesModule } from './packages/packages.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'),
            serveRoot: '/api/uploads',
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
        PaymentModule,
        WebhookModule,
        UploadModule,
        PackagesModule,
    ],
})
export class AppModule { }
