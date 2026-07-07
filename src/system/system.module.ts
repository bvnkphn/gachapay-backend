import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { MaintenanceMiddleware } from './maintenance.middleware';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SystemController],
  providers:   [SystemService, MaintenanceMiddleware],
  exports:     [SystemService, MaintenanceMiddleware],
})
export class SystemModule {}
