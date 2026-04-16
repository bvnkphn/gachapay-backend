import { IsString, IsNumber, IsEmail, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO สำหรับตรวจสอบข้อมูล Top-up ก่อนสร้างคำสั่งซื้อ
 * Validate Top-up Data Before Creating Order
 */
export class PlayerFieldDto {
    @IsString()
    key: string;

    @IsString()
    value: string;
}

export class ValidateTopupDto {
    @IsNumber()
    gameId: number;

    @IsNumber()
    packageId: number;

    @IsEmail()
    email: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PlayerFieldDto)
    playerFields: PlayerFieldDto[];

    @IsOptional()
    @IsString()
    couponCode?: string;
}

/**
 * DTO สำหรับตอบสนองการตรวจสอบ Top-up
 * Top-up Validation Response
 */
export class ValidateTopupResponseDto {
    success: boolean;
    message: string;
    
    data?: {
        gameId: number;
        gameName: string;
        packageId: number;
        packageName: string;
        packagePrice: number;
        email: string;
        playerFieldsValid: boolean;
        couponApplied?: {
            code: string;
            discountAmount: number;
            finalPrice: number;
        };
        estimatedPrice: number;
    };

    errors?: string[];
    warnings?: string[];
}
