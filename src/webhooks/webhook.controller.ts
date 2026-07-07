import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from '../payments/payment.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
    constructor(private paymentService: PaymentService) { }

    /**
     * Handle payment gateway webhooks
     * POST /webhooks/payment-update
     * 
     * Body: {
     *   referenceId: string,
     *   status: 'completed' | 'failed' | 'cancelled',
     *   amount: number,
     *   userId: string,
     *   timestamp: number,
     *   signature: string (for verification)
     * }
     */
    @Post('payment-update')
    async handlePaymentUpdate(
        @Body()
        payload: {
            referenceId: string;
            status: 'completed' | 'failed' | 'cancelled';
            amount: number;
            userId: string;
            timestamp: number;
            signature?: string;
        },
    ) {
        // Verify webhook signature (implement based on your payment gateway)
        // For now, basic validation
        if (!payload.referenceId || !payload.status || !payload.userId) {
            throw new BadRequestException('Missing required fields');
        }

        // Process the payment update
        const result = await this.paymentService.updatePaymentStatus(
            payload.referenceId,
            payload.status,
            payload.amount,
            BigInt(payload.userId),
        );

        return {
            success: true,
            message: 'Webhook processed',
            data: result.data,
        };
    }

    /**
     * PromptPay webhook handler
     * POST /webhooks/promptpay
     */
    @Post('promptpay')
    async handlePromptPayWebhook(@Body() payload: any) {
        // Parse PromptPay specific webhook format
        // This depends on PromptPay's actual webhook format
        
        const referenceId = payload.referenceId || payload.transactionId;
        const status = payload.status === 'SUCCESS' ? 'completed' : 'failed';
        const amount = payload.amount;
        const userId = payload.userId;

        return this.handlePaymentUpdate({
            referenceId,
            status,
            amount,
            userId,
            timestamp: Date.now(),
        });
    }

    /**
     * TrueMoney webhook handler
     * POST /webhooks/truemoney
     */
    @Post('truemoney')
    async handleTrueMoneyWebhook(@Body() payload: any) {
        // Parse TrueMoney specific webhook format
        
        const referenceId = payload.referenceId || payload.transactionId;
        const status = payload.status === 'SUCCESS' ? 'completed' : 'failed';
        const amount = payload.amount;
        const userId = payload.userId;

        return this.handlePaymentUpdate({
            referenceId,
            status,
            amount,
            userId,
            timestamp: Date.now(),
        });
    }
}
