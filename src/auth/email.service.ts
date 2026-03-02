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

    async sendOtpEmail(to: string, otp: string) {
        const mailOptions = {
            from: this.configService.get('EMAIL_FROM'),
            to,
            subject: 'รหัส OTP สำหรับรีเซ็ตรหัสผ่าน - CYBERPAY',
            html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 10px;">
          <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #667eea; margin: 0; font-size: 28px;">🎮 CYBERPAY</h1>
              <p style="color: #666; margin-top: 10px;">รหัส OTP สำหรับรีเซ็ตรหัสผ่าน</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin: 30px 0;">
              <p style="color: white; margin: 0 0 15px 0; font-size: 14px; opacity: 0.9;">รหัส OTP ของคุณคือ</p>
              <div style="background: white; display: inline-block; padding: 20px 40px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">${otp}</span>
              </div>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                ⏰ รหัส OTP นี้จะหมดอายุใน <strong style="color: #667eea;">10 นาที</strong>
              </p>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
                🔒 กรุณาอย่าแชร์รหัสนี้กับผู้อื่น
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 13px; margin: 0;">
                หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: white; font-size: 12px; opacity: 0.8; margin: 0;">
              © 2024 CYBERPAY. All rights reserved.
            </p>
          </div>
        </div>
      `,
        };

        try {
            const emailUser = this.configService.get('EMAIL_USER');
            if (!emailUser || emailUser === 'your-email@gmail.com') {
                // Development mode: log OTP
                console.log('='.repeat(80));
                console.log('📧 OTP Email (Development Mode)');
                console.log('='.repeat(80));
                console.log('To:', to);
                console.log('OTP Code:', otp);
                console.log('Expires in: 10 minutes');
                console.log('='.repeat(80));
                return;
            }

            await this.transporter.sendMail(mailOptions);
            console.log('OTP email sent to:', to);
        } catch (error) {
            console.error('Error sending OTP email:', error);
            throw error;
        }
    }
}
