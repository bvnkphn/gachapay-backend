import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class ValidateCouponDto {
    @IsString()
    @IsNotEmpty()
    code: string;

    @IsOptional()
    @IsNumber()
    gameId?: number;

    @IsOptional()
    @IsNumber()
    packageId?: number;

    @IsOptional()
    @IsNumber()
    amount?: number; // Amount user wants to use for (for minimum validation)
}
