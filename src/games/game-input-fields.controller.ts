import { Controller, Get, Post, Body, Put, Delete, Param } from '@nestjs/common';
import { GameInputFieldsService } from './game-input-fields.service';

@Controller('games')
export class GameInputFieldsController {
    constructor(private fieldService: GameInputFieldsService) {}

    // Get all input fields for a game by ID
    @Get(':gameId/input-fields')
    async getFieldsByGameId(@Param('gameId') gameId: string) {
        const fields = await this.fieldService.getFieldsByGameId(BigInt(gameId));
        return { data: fields };
    }

    // Create a new input field
    @Post(':gameId/input-fields')
    async createField(
        @Param('gameId') gameId: string,
        @Body() data: any,
    ) {
        const field = await this.fieldService.createField(BigInt(gameId), data);
        return { data: field };
    }

    // Update an input field
    @Put('input-fields/:fieldId')
    async updateField(
        @Param('fieldId') fieldId: string,
        @Body() data: any,
    ) {
        const field = await this.fieldService.updateField(BigInt(fieldId), data);
        return { data: field };
    }

    // Delete an input field
    @Delete('input-fields/:fieldId')
    async deleteField(@Param('fieldId') fieldId: string) {
        await this.fieldService.deleteField(BigInt(fieldId));
        return { success: true };
    }

    // Add option to a field
    @Post('input-fields/:fieldId/options')
    async addFieldOption(
        @Param('fieldId') fieldId: string,
        @Body() data: any,
    ) {
        const option = await this.fieldService.addFieldOption(BigInt(fieldId), data);
        return { data: option };
    }

    // Update field option
    @Put('input-fields/:fieldId/options/:optionId')
    async updateFieldOption(
        @Param('optionId') optionId: string,
        @Body() data: any,
    ) {
        const option = await this.fieldService.updateFieldOption(BigInt(optionId), data);
        return { data: option };
    }

    // Delete field option
    @Delete('input-fields/:fieldId/options/:optionId')
    async deleteFieldOption(@Param('optionId') optionId: string) {
        await this.fieldService.deleteFieldOption(BigInt(optionId));
        return { success: true };
    }
}
