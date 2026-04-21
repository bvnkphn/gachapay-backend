import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, IsObject, IsDecimal } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateOrderDto {
    @Transform(({ value }) => {
        // Accept both numeric IDs and string slugs
        if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed)) return BigInt(parsed);
        }
        return value; // Return as-is if not numeric (e.g., slug)
    }, { toClassOnly: true })
    @IsNotEmpty()
    gameId: bigint | string | number; // Can be numeric ID or slug

    @IsString()
    @IsNotEmpty()
    gameName: string;

    @Transform(({ value }) => {
        // Accept both numeric IDs and string slugs
        if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed)) return BigInt(parsed);
        }
        return value;
    }, { toClassOnly: true })
    @IsNotEmpty()
    packageId: bigint | string | number; // Can be numeric ID or slug

    @IsString()
    @IsNotEmpty()
    packageName: string;

    @Type(() => Number)
    @IsPositive()
    @IsNotEmpty()
    packagePrice: number;

    @IsString()
    @IsNotEmpty()
    uid: string; // Game user ID

    @IsString()
    @IsOptional()
    email?: string; // Email for non-logged-in users

    @IsString()
    @IsOptional()
    couponCode?: string; // Applied coupon code

    @IsString()
    @IsOptional()
    paymentMethod?: string;
}
