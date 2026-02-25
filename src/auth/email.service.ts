import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('EMAIL_HOST'),
            port: this.configService.get('EMAIL_PORT'),
            secure: this.configService.get('EMAIL_SECURE') === 'true',
            auth: {
                user: this.configService.get('EMAIL_USER'),
                pass: this.configService.get('EMAIL_PASSWORD'),
            },
        });
    }

    async sendPasswordResetEmail(to: string, resetUrl: string) {
        const mailOptions = {
            from: this.configService.get('EMAIL_FROM'),
            to,
            subject: 'รีเซ็ตรหัสผ่าน - Game Top-up',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>รีเซ็ตรหัสผ่าน</h2>
          <p>คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ</p>
          <p>กรุณาคลิกลิงก์ด้านล่างเพื่อรีเซ็ตรหัสผ่าน:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">รีเซ็ตรหัสผ่าน</a>
          <p style="margin-top: 20px;">ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง</p>
          <p>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้</p>
        </div>
      `,
        };

        try {
            // Check if email is configured
            const emailUser = this.configService.get('EMAIL_USER');
            if (!emailUser || emailUser === 'your-email@gmail.com') {
                // Development mode: just log the reset URL
                console.log('='.repeat(80));
                console.log('📧 Password Reset Email (Development Mode)');
                console.log('='.repeat(80));
                console.log('To:', to);
                console.log('Reset URL:', resetUrl);
                console.log('='.repeat(80));
                return;
            }

            await this.transporter.sendMail(mailOptions);
            console.log('Password reset email sent to:', to);
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }
}
