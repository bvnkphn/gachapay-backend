import {
    Controller, Post, UseInterceptors,
    UploadedFile, BadRequestException, UseGuards, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

const uploadDir = join(process.cwd(), 'uploads', 'games');
const slipUploadDir = join(process.cwd(), 'uploads', 'slips');

@ApiTags('Upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {

    // POST /upload/game-image — อัปโหลดโลโก้/รูปเกม (Admin only)
    @Post('game-image')
    @UseGuards(JwtAuthGuard, AdminGuard)
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (_req, _file, cb) => {
                if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
                cb(null, uploadDir);
            },
            filename: (_req, file, cb) => {
                const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `game-${unique}${extname(file.originalname)}`);
            },
        }),
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
                return cb(new BadRequestException('รองรับเฉพาะไฟล์รูปภาพเท่านั้น (jpg, jpeg, png, gif, webp)'), false);
            }
            cb(null, true);
        },
    }))
    uploadGameImage(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('ไม่พบไฟล์ กรุณาแนบไฟล์รูปภาพ');
        const baseUrl = this.getBaseUrl(req);
        return {
            success: true,
            url: `${baseUrl}/api/uploads/games/${file.filename}`,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
        };
    }

    // POST /upload/slip — อัปโหลดสลิปการโอนเงิน (Authenticated users)
    @Post('slip')
    @UseGuards(JwtAuthGuard)
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (_req, _file, cb) => {
                if (!existsSync(slipUploadDir)) mkdirSync(slipUploadDir, { recursive: true });
                cb(null, slipUploadDir);
            },
            filename: (_req, file, cb) => {
                const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `slip-${unique}${extname(file.originalname)}`);
            },
        }),
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
                return cb(new BadRequestException('รองรับเฉพาะไฟล์รูปภาพเท่านั้น (jpg, jpeg, png, gif, webp)'), false);
            }
            cb(null, true);
        },
    }))
    uploadSlip(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('ไม่พบไฟล์ กรุณาแนบไฟล์สลิปการโอนเงิน');
        const baseUrl = this.getBaseUrl(req);
        return {
            success: true,
            url: `${baseUrl}/api/uploads/slips/${file.filename}`,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
        };
    }

    private getBaseUrl(req: Request) {
        const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
        const protocol = forwardedProto || req.protocol;
        const host = req.get('host') || 'localhost:3001';
        return process.env.BACKEND_URL?.replace(/\/$/, '') || `${protocol}://${host}`;
    }
}
