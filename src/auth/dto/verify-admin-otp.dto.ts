import { IsString } from 'class-validator';

export class VerifyAdminOtpDto {
    @IsString()
    userId: string;

    @IsString()
    otp: string;
}
