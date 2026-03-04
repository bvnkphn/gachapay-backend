import { NestFactory }    from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule }      from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin:      process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist:        true,
    transform:        true,
    transformOptions: { enableImplicitConversion: true },
  }));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`\n🚀 Backend: http://localhost:${port}/api\n`);
  console.log('  GET  /api/games                   ← หน้า Home (game list)');
  console.log('  GET  /api/games/banners            ← banner carousel');
  console.log('  GET  /api/games/:slug              ← หน้า Top-up (packages)');
  console.log('  POST /api/topup/validate-uid       ← ตรวจสอบ UID');
  console.log('  POST /api/topup/calculate-price    ← คำนวณราคา');
  console.log('  POST /api/coupons/validate         ← ตรวจ coupon (checkout)');
  console.log('  POST /api/orders                   ← สร้าง order');
  console.log('  POST /api/orders/:id/pay           ← ชำระเงิน');
  console.log('  GET  /api/orders/track/:no         ← ติดตาม order\n');
}
bootstrap();
