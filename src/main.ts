import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Fix BigInt serialization
BigInt.prototype['toJSON'] = function () {
    return this.toString();
};

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

    const port = process.env.PORT || 3001;
    await app.listen(port);

    console.log(`🚀 Backend server running on http://localhost:${port}`);
    console.log(`📚 API available at http://localhost:${port}/api`);
    console.log(`🔎 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
