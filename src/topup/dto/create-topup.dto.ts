import { IsNumber, IsString, Min } from 'class-validator';

export class CreateTopupDto {
    @IsNumber()
    @Min(20)
    amount: number;

    @IsString()
    methodCode: string; // promptpay | truemoney
}
