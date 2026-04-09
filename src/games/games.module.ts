import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { GameInputFieldsService } from './game-input-fields.service';
import { GameInputFieldsController } from './game-input-fields.controller';
import { CategoriesModule } from '../categories/categories.module';

@Module({
    imports: [CategoriesModule],
    controllers: [GamesController, GameInputFieldsController],
    providers: [GamesService, GameInputFieldsService],
    exports: [GamesService, GameInputFieldsService],
})
export class GamesModule { }
