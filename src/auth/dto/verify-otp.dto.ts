import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class SendOtpDto {
    @IsEmail()
    email: string;
}

export class VerifyOtpDto {
    @IsEmail()
    email: string;

    @IsString()
    @Length(6, 6)
    otp: string;

    @IsString()
    @MinLength(8)
    newPassword: string;
}
