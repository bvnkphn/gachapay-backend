import {
    Controller, Post, UseInterceptors,
    UploadedFile, BadRequestException, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

const uploadDir = join(process.cwd(), 'uploads', 'games');

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
    uploadGameImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('ไม่พบไฟล์ กรุณาแนบไฟล์รูปภาพ');
        return {
            success: true,
            url: `/api/uploads/games/${file.filename}`,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
        };
    }
}
