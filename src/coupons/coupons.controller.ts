import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CouponValidationResponseDto } from './dto/coupon-validation-response.dto';

@Controller('coupons')
export class CouponsController {
    constructor(private couponsService: CouponsService) {}

    /**
     * Validate a coupon code
     * POST /coupons/validate
     * Body: { code, gameId?, packageId?, amount? }
     * Headers: Authorization (user token)
     */
    @Post('validate')
    async validateCoupon(
        @Body() validateDto: ValidateCouponDto,
        @Query('userId') userId: string,
    ): Promise<CouponValidationResponseDto> {
        // In real implementation, extract userId from JWT token
        const userIdBigInt = BigInt(userId);
        return this.couponsService.validateCoupon(validateDto, userIdBigInt);
    }

    /**
     * Apply coupon to an order
     * POST /coupons/apply
     */
    @Post('apply')
    async applyCoupon(
        @Body() body: {
            code: string;
            userId: string;
            orderId: string;
            usedAmount: number;
            ipAddress?: string;
        }
    ) {
        const usage = await this.couponsService.applyCoupon(
            body.code,
            BigInt(body.userId),
            BigInt(body.orderId),
            body.usedAmount,
            body.ipAddress,
        );

        return {
            success: true,
            message: 'Coupon applied successfully',
            data: usage,
        };
    }

    /**
     * Get coupon by code
     * GET /coupons/:code
     */
    @Get(':code')
    async getCoupon(@Param('code') code: string) {
        const coupon = await this.couponsService.getCoupon(code);
        return {
            success: true,
            data: coupon,
        };
    }

    /**
     * Get all coupons (admin)
     * GET /coupons
     */
    @Get()
    async getAllCoupons() {
        const coupons = await this.couponsService.getAllCoupons();
        return {
            success: true,
            data: coupons,
        };
    }

    /**
     * Get user's coupon usage history
     * GET /coupons/history/:userId
     */
    @Get('history/:userId')
    async getUserCouponHistory(@Param('userId') userId: string) {
        const history = await this.couponsService.getUserCouponHistory(BigInt(userId));
        return {
            success: true,
            data: history,
        };
    }

    /**
     * Create a new coupon (admin)
     * POST /coupons
     */
    @Post()
    async createCoupon(@Body() createCouponDto: CreateCouponDto) {
        const coupon = await this.couponsService.createCoupon(createCouponDto);
        return {
            success: true,
            message: 'Coupon created successfully',
            data: coupon,
        };
    }

    /**
     * Update a coupon (admin)
     * PUT /coupons/:id
     */
    @Put(':id')
    async updateCoupon(
        @Param('id') id: string,
        @Body() updateData: Partial<CreateCouponDto>,
    ) {
        const coupon = await this.couponsService.updateCoupon(BigInt(id), updateData);
        return {
            success: true,
            message: 'Coupon updated successfully',
            data: coupon,
        };
    }

    /**
     * Delete a coupon (admin)
     * DELETE /coupons/:id
     */
    @Delete(':id')
    async deleteCoupon(@Param('id') id: string) {
        await this.couponsService.deleteCoupon(BigInt(id));
        return {
            success: true,
            message: 'Coupon deleted successfully',
        };
    }
}
