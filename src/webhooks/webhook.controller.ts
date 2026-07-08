import { Controller, Post, Body, BadRequestException, Query, Headers, ForbiddenException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from '../payments/payment.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Webhooks')
@Controller(['webhooks', 'webhook'])
export class WebhookController {
    constructor(
        private paymentService: PaymentService,
        private configService: ConfigService,
    ) { }

    private verifyWebhookSecret(clientSecret?: string) {
        const expectedSecret = this.configService.get('WEBHOOK_SECRET');
        // If WEBHOOK_SECRET is set in env, enforce secret key check
        if (expectedSecret) {
            if (!clientSecret || clientSecret !== expectedSecret) {
                throw new ForbiddenException('Invalid or missing webhook secret');
            }
        }
    }

    /**
     * Handle payment gateway webhooks
     * POST /webhooks/payment-update
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
        @Query('secret') secret?: string,
        @Headers('x-webhook-secret') headerSecret?: string,
    ) {
        this.verifyWebhookSecret(secret || headerSecret || payload.signature);

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
    async handlePromptPayWebhook(
        @Body() payload: any,
        @Query('secret') secret?: string,
        @Headers('x-webhook-secret') headerSecret?: string,
    ) {
        this.verifyWebhookSecret(secret || headerSecret || payload.signature || payload.secret);

        // If it's a real Omise webhook event
        if (payload.object === 'event' && payload.data?.object === 'charge') {
            const charge = payload.data;
            const chargeId = charge.id;
            const status = charge.status === 'successful' ? 'completed' : (charge.status === 'failed' ? 'failed' : 'pending');
            const result = await this.paymentService.handleOmiseWebhook(chargeId, status, Number(charge.amount) / 100);
            return { success: true, message: 'Omise webhook processed', data: result };
        }

        // Fallback for simulated trigger format
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
        }, secret, headerSecret);
    }

    /**
     * TrueMoney webhook handler
     * POST /webhooks/truemoney
     */
    @Post('truemoney')
    async handleTrueMoneyWebhook(
        @Body() payload: any,
        @Query('secret') secret?: string,
        @Headers('x-webhook-secret') headerSecret?: string,
    ) {
        this.verifyWebhookSecret(secret || headerSecret || payload.signature || payload.secret);

        // If it's a real Omise webhook event
        if (payload.object === 'event' && payload.data?.object === 'charge') {
            const charge = payload.data;
            const chargeId = charge.id;
            const status = charge.status === 'successful' ? 'completed' : (charge.status === 'failed' ? 'failed' : 'pending');
            const result = await this.paymentService.handleOmiseWebhook(chargeId, status, Number(charge.amount) / 100);
            return { success: true, message: 'Omise webhook processed', data: result };
        }

        // Fallback for simulated trigger format
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
        }, secret, headerSecret);
    }

    /**
     * Cyberpay webhook handler
     * POST /webhooks/cyberpay
     */
    @Post('cyberpay')
    async handleCyberpayWebhook(
        @Body() payload: any,
        @Query('secret') secret?: string,
        @Headers('x-webhook-secret') headerSecret?: string,
    ) {
        this.verifyWebhookSecret(secret || headerSecret || payload.signature || payload.secret);
        console.log('Cyberpay Webhook Payload:', payload);

        const referenceId = payload.ref_1 || payload.ref1 || payload.referenceId;
        const amount = payload.amount ? Number(payload.amount) : undefined;
        const transactionId = payload.transaction_id || payload.transactionId;

        if (!referenceId) {
            throw new BadRequestException('Missing referenceId (ref_1)');
        }

        const tx = await this.paymentService.findTransactionByRef(referenceId);
        if (!tx) {
            throw new BadRequestException('Transaction not found');
        }

        const status = 'completed'; // Webhook from gateway is usually only sent upon success
        await this.paymentService.updatePaymentStatus(
            referenceId,
            status,
            amount || Number(tx.amount),
            tx.userId
        );

        return {
            status: true,
            message: 'success',
            data: {
                transaction_id: transactionId || 'unknown'
            }
        };
    }

    /**
     * Stripe webhook handler
     * POST /webhooks/stripe
     */
    @Post('stripe')
    async handleStripeWebhook(
        @Body() payload: any,
        @Query('secret') secret?: string,
        @Headers('x-webhook-secret') headerSecret?: string,
    ) {
        this.verifyWebhookSecret(secret || headerSecret || payload.signature || payload.secret);
        console.log('Stripe Webhook Event:', payload.type);

        if (payload.type === 'payment_intent.succeeded') {
            const paymentIntent = payload.data?.object;
            const referenceId = paymentIntent?.metadata?.reference_id;
            const amountInThb = paymentIntent?.amount ? Number(paymentIntent.amount) / 100 : undefined;

            if (!referenceId) {
                throw new BadRequestException('Missing reference_id in Stripe metadata');
            }

            const tx = await this.paymentService.findTransactionByRef(referenceId);
            if (!tx) {
                throw new BadRequestException('Transaction not found');
            }

            const status = 'completed';
            await this.paymentService.updatePaymentStatus(
                referenceId,
                status,
                amountInThb || Number(tx.amount),
                tx.userId
            );
        }

        return { received: true };
    }
}
