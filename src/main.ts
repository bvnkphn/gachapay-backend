import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Fallback DIRECT_URL to DATABASE_URL if missing at runtime
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
}

// Fix BigInt serialization
Object.defineProperty(BigInt.prototype, 'toJSON', {
    value: function (this: bigint) {
        return this.toString();
    },
    configurable: true,
    writable: true,
});

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Enable CORS
    const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const origins = frontendUrl.split(',').map(o => o.trim());
    if (!origins.includes('http://localhost:3000')) origins.push('http://localhost:3000');
    if (!origins.includes('http://localhost:3002')) origins.push('http://localhost:3002');
    if (!origins.includes('https://gachapay-frontend.vercel.app')) origins.push('https://gachapay-frontend.vercel.app');

    app.enableCors({
        origin: origins,
        credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );


    app.setGlobalPrefix('api');

    
    const config = new DocumentBuilder()
        .setTitle('Gachapay API')
        .setDescription('API documentation for Gachapay backend')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app as any, config);
    SwaggerModule.setup('api/docs', app as any, document);

    const port = configService.get('PORT') || 3001;
    await app.listen(port);

    console.log(`🚀 Backend server running on http://localhost:${port}`);
    console.log(`📚 API available at http://localhost:${port}/api`);
    console.log(`🔎 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
