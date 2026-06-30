import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Query,
    UseGuards,
    Req,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PaymentService } from './payment.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
    constructor(private paymentService: PaymentService) { }

    @Get('admin/settings')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async getAdminSettings() {
        return this.paymentService.getAdminSettings();
    }

    @Post('admin/settings')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async saveAdminSettings(@Body() body: { settings: any }) {
        return this.paymentService.saveAdminSettings(body.settings);
    }

    @Get('admin/logs')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async getAdminLogs() {
        return this.paymentService.getAdminLogs();
    }

    @Get('active-methods')
    async getActiveMethods() {
        return this.paymentService.getActiveMethods();
    }

    /**
     * Process Gacha Wallet Payment
     * POST /api/payments/process-wallet-payment
     */
    @Post('process-wallet-payment')
    @UseGuards(JwtAuthGuard)
    async processWalletPayment(
        @Req() req: any,
        @Body()
        dto: {
            orderId: number;
            amount: number;
            paymentMethod: string;
        },
    ) {
        return this.paymentService.processWalletPayment(
            dto.orderId,
            req.user.id,
            dto.amount,
        );
    }

    /**
     * Generate QR Code for Payment
     * POST /api/payments/generate-qr
     */
    @Post('generate-qr')
    @UseGuards(JwtAuthGuard)
    async generateQRCode(
        @Req() req: any,
        @Body()
        dto: {
            orderId: number;
            amount: number;
            method: 'promptpay' | 'truemoney' | 'bank_transfer';
        },
    ) {
        if (!['promptpay', 'truemoney', 'bank_transfer'].includes(dto.method)) {
            throw new BadRequestException('Invalid payment method');
        }

        return this.paymentService.generateQRCode(
            dto.orderId,
            dto.amount,
            dto.method,
            req.user.id,
        );
    }

    /**
     * Check Payment Status
     * GET /api/payments/check-status?orderId=123
     */
    @Get('check-status')
    async checkPaymentStatus(@Query('orderId') orderId: string) {
        if (!orderId) {
            throw new BadRequestException('Order ID is required');
        }

        return this.paymentService.checkPaymentStatus(parseInt(orderId));
    }

    /**
     * Update Payment Status (Webhook from Payment Gateway)
     * PATCH /api/payments/update-status
     * Body: { referenceId, status, amount, userId }
     */
    @Patch('update-status')
    async updatePaymentStatus(
        @Body()
        dto: {
            referenceId: string;
            status: 'completed' | 'failed' | 'cancelled';
            amount: number;
            userId: string;
        },
    ) {
        return this.paymentService.updatePaymentStatus(
            dto.referenceId,
            dto.status,
            dto.amount,
            BigInt(dto.userId),
        );
    }
}
