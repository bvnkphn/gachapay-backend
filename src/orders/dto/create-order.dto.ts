import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateOrderDto {
    @Transform(({ value }) => BigInt(value))
    @IsNotEmpty()
    gameId: bigint;

    @IsString()
    @IsNotEmpty()
    gameName: string;

    @Transform(({ value }) => BigInt(value))
    @IsNotEmpty()
    packageId: bigint;

    @IsString()
    @IsNotEmpty()
    packageName: string;

    @IsNumber()
    @IsPositive()
    packagePrice: number;

    @IsString()
    @IsNotEmpty()
    uid: string;

    @IsString()
    paymentMethod?: string;
}
