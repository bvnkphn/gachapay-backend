import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { GameInputFieldsService } from './game-input-fields.service';
import { GameInputFieldsController } from './game-input-fields.controller';
import { GameImportService } from './game-import.service';
import { GameImportController } from './game-import.controller';
import { ExternalGameService } from './external-game.service';
import { CategoriesModule } from '../categories/categories.module';

@Module({
    imports: [CategoriesModule],
    controllers: [GamesController, GameInputFieldsController, GameImportController],
    providers: [GamesService, GameInputFieldsService, GameImportService, ExternalGameService],
    exports: [GamesService, GameInputFieldsService, GameImportService, ExternalGameService],
})
export class GamesModule { }
