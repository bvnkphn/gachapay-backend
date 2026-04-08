import { Module } from '@nestjs/common';
import { WalletsController } from './wallets.controller';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [UsersModule],
    controllers: [WalletsController],
})
export class WalletsModule { }
