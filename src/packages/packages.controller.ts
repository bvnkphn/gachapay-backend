import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { PackagesService, CreatePackageDto, UpdatePackageDto, FlashSaleDto } from './packages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Admin — Packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/games/:gameId/packages')
export class PackagesController {
    constructor(private readonly packagesService: PackagesService) {}

    // GET /admin/games/:gameId/packages
    // ดึงแพ็กเกจทั้งหมดของเกม (รวมข้อมูล profit, flash sale status, quota)
    @Get()
    @ApiOperation({ summary: 'ดึงแพ็กเกจทั้งหมดของเกม พร้อมกำไรและสถานะ Flash Sale' })
    async findAll(@Param('gameId') gameId: string) {
        const data = await this.packagesService.findAllByGame(BigInt(gameId));
        return { data };
    }

    // POST /admin/games/:gameId/packages
    // สร้างแพ็กเกจใหม่
    @Post()
    @ApiOperation({ summary: 'สร้างแพ็กเกจใหม่' })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['sku', 'name', 'price'],
            properties: {
                sku:             { type: 'string',  example: 'freefire-100-diamond' },
                name:            { type: 'string',  example: '100 เพชร' },
                description:     { type: 'string',  example: 'แพ็กเกจ 100 เพชร' },
                price:           { type: 'number',  example: 29.00 },
                originalPrice:   { type: 'number',  example: 35.00 },
                cost:            { type: 'number',  example: 20.00 },
                discount:        { type: 'number',  example: 0 },
                flashSalePrice:  { type: 'number',  example: 25.00 },
                flashSaleStart:  { type: 'string',  example: '2026-05-12T10:00:00Z' },
                flashSaleEnd:    { type: 'string',  example: '2026-05-12T12:00:00Z' },
                quota:           { type: 'number',  example: 100 },
                isActive:        { type: 'boolean', example: true },
            },
        },
    })
    async create(
        @Param('gameId') gameId: string,
        @Body() body: CreatePackageDto,
    ) {
        return this.packagesService.create(BigInt(gameId), body);
    }

    // PATCH /admin/games/:gameId/packages/:packageId
    // แก้ไขข้อมูลแพ็กเกจ (ราคา, ต้นทุน, flash sale, quota ฯลฯ)
    @Patch(':packageId')
    @ApiOperation({ summary: 'แก้ไขข้อมูลแพ็กเกจ รวมถึงราคา ต้นทุน Flash Sale และ Quota' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name:            { type: 'string' },
                description:     { type: 'string' },
                price:           { type: 'number',  example: 29.00 },
                originalPrice:   { type: 'number',  example: 35.00 },
                cost:            { type: 'number',  example: 20.00 },
                discount:        { type: 'number' },
                flashSalePrice:  { type: 'number',  nullable: true, example: 25.00 },
                flashSaleStart:  { type: 'string',  nullable: true, example: '2026-05-12T10:00:00Z' },
                flashSaleEnd:    { type: 'string',  nullable: true, example: '2026-05-12T12:00:00Z' },
                quota:           { type: 'number',  nullable: true, example: 100 },
                isActive:        { type: 'boolean' },
            },
        },
    })
    async update(
        @Param('packageId') packageId: string,
        @Body() body: UpdatePackageDto,
    ) {
        return this.packagesService.update(BigInt(packageId), body);
    }

    // PATCH /admin/games/:gameId/packages/:packageId/flash-sale
    // ตั้งค่า Flash Sale / Happy Hour แยกต่างหาก
    @Patch(':packageId/flash-sale')
    @ApiOperation({ summary: 'ตั้งค่าหรือยกเลิก Flash Sale / Happy Hour ของแพ็กเกจ' })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['flashSalePrice'],
            properties: {
                flashSalePrice: {
                    type: 'number',
                    nullable: true,
                    description: 'ราคา Flash Sale — ส่ง null เพื่อยกเลิก Flash Sale',
                    example: 25.00,
                },
                flashSaleStart: { type: 'string', example: '2026-05-12T10:00:00Z' },
                flashSaleEnd:   { type: 'string', example: '2026-05-12T12:00:00Z' },
            },
        },
    })
    async setFlashSale(
        @Param('packageId') packageId: string,
        @Body() body: FlashSaleDto,
    ) {
        return this.packagesService.setFlashSale(BigInt(packageId), body);
    }

    // DELETE /admin/games/:gameId/packages/:packageId
    // ลบแพ็กเกจ (soft delete — ตั้ง isActive = false)
    @Delete(':packageId')
    @ApiOperation({ summary: 'ลบแพ็กเกจ (soft delete) จะไม่สามารถลบได้หากมี order pending' })
    async remove(@Param('packageId') packageId: string) {
        return this.packagesService.remove(BigInt(packageId));
    }
}
