import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
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
import { SystemModule } from './system/system.module';
import { SupportModule } from './support/support.module';
import { FaqModule } from './faq/faq.module';
import { ReportsModule } from './reports/reports.module';
import { ApiCreditModule } from './api-credit/api-credit.module';
import { MaintenanceMiddleware } from './system/maintenance.middleware';

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
    SystemModule,
    SupportModule,
    FaqModule,
    ReportsModule,
    ApiCreditModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MaintenanceMiddleware).forRoutes('*');
  }
}
