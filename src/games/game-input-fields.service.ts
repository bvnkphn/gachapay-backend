import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GameInputFieldsService {
    constructor(private readonly prisma: PrismaService) {}

    // Get all input fields for a game
    async getFieldsByGameId(gameId: bigint) {
        return this.prisma.gameInputField.findMany({
            where: { gameId, isActive: true },
            include: {
                options: {
                    where: { isActive: true },
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: { order: 'asc' },
        });
    }

    // Get all input fields for a game by slug
    async getFieldsByGameSlug(slug: string) {
        const game = await this.prisma.game.findUnique({
            where: { slug },
        });

        if (!game) return null;

        return this.getFieldsByGameId(game.id);
    }

    // Create a new input field for a game
    async createField(gameId: bigint, data: any) {
        return this.prisma.gameInputField.create({
            data: {
                gameId,
                key: data.key,
                label: data.label,
                placeholder: data.placeholder,
                type: data.type || 'text',
                required: data.required !== false,
                regex: data.regex,
                helpText: data.helpText,
                order: data.order || 0,
            },
            include: {
                options: true,
            },
        });
    }

    // Update an input field
    async updateField(fieldId: bigint, data: any) {
        return this.prisma.gameInputField.update({
            where: { id: fieldId },
            data: {
                label: data.label,
                placeholder: data.placeholder,
                type: data.type,
                required: data.required,
                regex: data.regex,
                helpText: data.helpText,
                order: data.order,
            },
            include: {
                options: true,
            },
        });
    }

    // Delete an input field (soft delete)
    async deleteField(fieldId: bigint) {
        return this.prisma.gameInputField.update({
            where: { id: fieldId },
            data: { isActive: false },
        });
    }

    // Add option to a field
    async addFieldOption(fieldId: bigint, data: any) {
        return this.prisma.gameInputFieldOption.create({
            data: {
                fieldId,
                label: data.label,
                value: data.value,
                order: data.order || 0,
            },
        });
    }

    // Update field option
    async updateFieldOption(optionId: bigint, data: any) {
        return this.prisma.gameInputFieldOption.update({
            where: { id: optionId },
            data: {
                label: data.label,
                value: data.value,
                order: data.order,
            },
        });
    }

    // Delete field option (soft delete)
    async deleteFieldOption(optionId: bigint) {
        return this.prisma.gameInputFieldOption.update({
            where: { id: optionId },
            data: { isActive: false },
        });
    }
}
