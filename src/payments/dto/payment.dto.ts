import { IsNumber, IsString, IsEnum, IsOptional } from 'class-validator';

export class ProcessWalletPaymentDto {
    @IsNumber()
    orderId: number;

    @IsNumber()
    amount: number;

    @IsString()
    paymentMethod: string;
}

export class GenerateQRCodeDto {
    @IsNumber()
    orderId: number;

    @IsNumber()
    amount: number;

    @IsEnum(['promptpay', 'truemoney'])
    method: 'promptpay' | 'truemoney';
}

export class UpdatePaymentStatusDto {
    @IsString()
    referenceId: string;

    @IsEnum(['completed', 'failed', 'cancelled'])
    status: 'completed' | 'failed' | 'cancelled';

    @IsNumber()
    amount: number;

    @IsString()
    userId: string;

    @IsOptional()
    @IsString()
    signature?: string;
}
