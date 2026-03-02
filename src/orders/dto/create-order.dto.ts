import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateOrderDto {
    @IsString()
    @IsNotEmpty()
    gameId: string;

    @IsString()
    @IsNotEmpty()
    gameName: string;

    @IsString()
    @IsNotEmpty()
    packageId: string;

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
