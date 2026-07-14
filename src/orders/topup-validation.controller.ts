import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TopupValidationService } from './topup-validation.service';
import { ValidateTopupDto, ValidateTopupResponseDto } from './dto/validate-topup.dto';

/**
 * Controller สำหรับตรวจสอบ Top-up ก่อนสร้างคำสั่งซื้อ
 * Controller for validating top-up before creating order
 */
@ApiTags('Top-up Validation')
@Controller('orders')
export class TopupValidationController {
    constructor(private readonly topupValidationService: TopupValidationService) {}

    /**
     * ตรวจสอบข้อมูล Top-up ก่อนสร้างคำสั่งซื้อ
     * POST /orders/validate-topup?userId={id}
     */
    @Post('validate-topup')
    async validateTopup(
        @Body() validateDto: ValidateTopupDto,
        @Query('userId') userId: string,
    ): Promise<ValidateTopupResponseDto> {
        const userIdBigInt = BigInt(userId);
        return this.topupValidationService.validateTopup(validateDto, userIdBigInt);
    }

    /**
     * ตรวจสอบและสร้างคำสั่งซื้อ
     * Validate and create order (used in checkout flow)
     * POST /orders/create-with-validation?userId={id}
     */
    @Post('create-with-validation')
    async createOrderWithValidation(
        @Body() validateDto: ValidateTopupDto,
        @Query('userId') userId: string,
    ) {
        const userIdBigInt = BigInt(userId);
        const result = await this.topupValidationService.createOrderWithValidation(
            validateDto,
            userIdBigInt,
        );

        return {
            success: true,
            message: result.message,
            data: result.data,
        };
    }

    /**
     * เตรียมข้อมูลคำสั่งซื้อสำหรับหน้าชำระเงิน
     * Order Preparation for Payment
     * GET /orders/prepare-payment?orderId={id}&userId={id}
     */
    @Get('prepare-payment')
    async prepareOrderForPayment(
        @Query('orderId') orderId: string,
        @Query('userId') userId: string,
    ) {
        const orderIdBigInt = BigInt(orderId);
        const userIdBigInt = BigInt(userId);
        return this.topupValidationService.prepareOrderForPayment(orderIdBigInt, userIdBigInt);
    }
}
