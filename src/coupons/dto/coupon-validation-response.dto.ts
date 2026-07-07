import { Decimal } from '@prisma/client/runtime/library';

export class CouponValidationResponseDto {
    success: boolean;
    message: string;
    data?: {
        code: string;
        discountType: string;
        discountValue: number;
        discountAmount: number;
        finalAmount: number;
        usageRemaining: number;
    };
    errors?: string[];
}
