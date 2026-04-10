import { IsString, IsNumber, IsDateString, IsOptional, IsArray, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

enum CouponDiscountType {
    FIXED = 'FIXED',
    PERCENTAGE = 'PERCENTAGE',
}

export class CreateCouponDto {
    @IsString()
    code: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsEnum(CouponDiscountType)
    discountType: CouponDiscountType;

    @IsNumber()
    @Min(0)
    discountValue: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    minimumAmount?: number;

    @IsNumber()
    @Min(0)
    maximumUses: number; // 0 = unlimited

    @IsNumber()
    @Min(1)
    usagePerUser: number;

    @IsDateString()
    startDate: string;

    @IsDateString()
    expiryDate: string;

    @IsOptional()
    @IsArray()
    @Type(() => Number)
    applicableGameIds?: number[];

    @IsOptional()
    @IsArray()
    @Type(() => Number)
    applicablePackageIds?: number[];

    @IsOptional()
    isActive?: boolean;
}
