import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PackagesService {
    constructor(private prisma: PrismaService) {}

    // ─── ดึงแพ็กเกจทั้งหมดของเกม ─────────────────────────────────────────────
    async findAllByGame(gameId: bigint) {
        const game = await this.prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new NotFoundException('ไม่พบเกมที่ระบุ');

        const packages = await this.prisma.gamePackage.findMany({
            where: { gameId },
            orderBy: { price: 'asc' },
        });

        const now = new Date();
        return packages.map((pkg) => this.formatPackage(pkg, now));
    }

    // ─── สร้างแพ็กเกจใหม่ ────────────────────────────────────────────────────
    async create(gameId: bigint, data: CreatePackageDto) {
        const game = await this.prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new NotFoundException('ไม่พบเกมที่ระบุ');

        // ตรวจสอบ flash sale
        this.validateFlashSale(data);

        const pkg = await this.prisma.gamePackage.create({
            data: {
                gameId,
                sku:           data.sku,
                name:          data.name,
                description:   data.description ?? null,
                price:         data.price,
                originalPrice: data.originalPrice ?? data.price,
                cost:          data.cost ?? 0,
                discount:      data.discount ?? 0,
                flashSalePrice: data.flashSalePrice ?? null,
                flashSaleStart: data.flashSaleStart ? new Date(data.flashSaleStart) : null,
                flashSaleEnd:   data.flashSaleEnd   ? new Date(data.flashSaleEnd)   : null,
                quota:          data.quota ?? null,
                soldCount:      0,
                isActive:       data.isActive ?? true,
            },
        });

        return { success: true, data: this.formatPackage(pkg, new Date()) };
    }

    // ─── อัปเดตแพ็กเกจ ───────────────────────────────────────────────────────
    async update(packageId: bigint, data: UpdatePackageDto) {
        const pkg = await this.prisma.gamePackage.findUnique({ where: { id: packageId } });
        if (!pkg) throw new NotFoundException('ไม่พบแพ็กเกจที่ระบุ');

        // ตรวจสอบ flash sale
        const merged = { ...pkg, ...data };
        this.validateFlashSale(merged as any);

        const updated = await this.prisma.gamePackage.update({
            where: { id: packageId },
            data: {
                name:           data.name          ?? pkg.name,
                description:    data.description   !== undefined ? data.description : pkg.description,
                price:          data.price         !== undefined ? data.price         : pkg.price,
                originalPrice:  data.originalPrice !== undefined ? data.originalPrice : pkg.originalPrice,
                cost:           data.cost          !== undefined ? data.cost           : pkg.cost,
                discount:       data.discount      !== undefined ? data.discount       : pkg.discount,
                flashSalePrice: data.flashSalePrice !== undefined ? (data.flashSalePrice ?? null) : pkg.flashSalePrice,
                flashSaleStart: data.flashSaleStart !== undefined ? (data.flashSaleStart ? new Date(data.flashSaleStart) : null) : pkg.flashSaleStart,
                flashSaleEnd:   data.flashSaleEnd   !== undefined ? (data.flashSaleEnd   ? new Date(data.flashSaleEnd)   : null) : pkg.flashSaleEnd,
                quota:          data.quota          !== undefined ? (data.quota ?? null) : pkg.quota,
                isActive:       data.isActive       !== undefined ? data.isActive        : pkg.isActive,
            },
        });

        return { success: true, data: this.formatPackage(updated, new Date()) };
    }

    // ─── ตั้งค่า Flash Sale ───────────────────────────────────────────────────
    async setFlashSale(packageId: bigint, data: FlashSaleDto) {
        const pkg = await this.prisma.gamePackage.findUnique({ where: { id: packageId } });
        if (!pkg) throw new NotFoundException('ไม่พบแพ็กเกจที่ระบุ');

        if (data.flashSalePrice !== null) {
            // เปิด flash sale
            if (!data.flashSaleStart || !data.flashSaleEnd) {
                throw new BadRequestException('ต้องระบุ flashSaleStart และ flashSaleEnd');
            }
            const start = new Date(data.flashSaleStart);
            const end   = new Date(data.flashSaleEnd);
            if (end <= start) throw new BadRequestException('flashSaleEnd ต้องมาหลัง flashSaleStart');
            if (data.flashSalePrice <= 0) throw new BadRequestException('flashSalePrice ต้องมากกว่า 0');

            const updated = await this.prisma.gamePackage.update({
                where: { id: packageId },
                data: {
                    flashSalePrice: data.flashSalePrice,
                    flashSaleStart: start,
                    flashSaleEnd:   end,
                },
            });
            return { success: true, message: 'ตั้งค่า Flash Sale สำเร็จ', data: this.formatPackage(updated, new Date()) };
        } else {
            // ยกเลิก flash sale
            const updated = await this.prisma.gamePackage.update({
                where: { id: packageId },
                data: { flashSalePrice: null, flashSaleStart: null, flashSaleEnd: null },
            });
            return { success: true, message: 'ยกเลิก Flash Sale สำเร็จ', data: this.formatPackage(updated, new Date()) };
        }
    }

    // ─── ลบแพ็กเกจ (soft delete) ─────────────────────────────────────────────
    async remove(packageId: bigint) {
        const pkg = await this.prisma.gamePackage.findUnique({ where: { id: packageId } });
        if (!pkg) throw new NotFoundException('ไม่พบแพ็กเกจที่ระบุ');

        // ตรวจว่ามี order pending อยู่ไหม
        const pendingOrders = await this.prisma.order.count({
            where: { packageId, status: 'pending' },
        });
        if (pendingOrders > 0) {
            throw new ConflictException(`ไม่สามารถลบได้ มีออเดอร์ pending อยู่ ${pendingOrders} รายการ`);
        }

        await this.prisma.gamePackage.update({
            where: { id: packageId },
            data: { isActive: false },
        });

        return { success: true, message: 'ลบแพ็กเกจสำเร็จ' };
    }

    // ─── Helper: คำนวณกำไรและ effective price ────────────────────────────────
    private formatPackage(pkg: any, now: Date) {
        const price         = Number(pkg.price);
        const cost          = Number(pkg.cost ?? 0);
        const originalPrice = Number(pkg.originalPrice) || price;
        const flashSalePrice = pkg.flashSalePrice ? Number(pkg.flashSalePrice) : null;

        // คำนวณว่า flash sale active ตอนนี้ไหม
        const isFlashSaleActive =
            flashSalePrice !== null &&
            pkg.flashSaleStart !== null &&
            pkg.flashSaleEnd !== null &&
            now >= new Date(pkg.flashSaleStart) &&
            now <= new Date(pkg.flashSaleEnd);

        // ราคาที่จะแสดงใน UI (ถ้า flash sale กำลัง active → ใช้ flashSalePrice)
        const effectivePrice = isFlashSaleActive ? flashSalePrice! : price;

        // กำไร = ราคาขายจริง - ต้นทุน
        const profit        = effectivePrice - cost;
        const profitPercent = cost > 0 ? ((profit / effectivePrice) * 100) : null;

        // สถานะ quota
        const quota      = pkg.quota ?? null;
        const soldCount  = pkg.soldCount ?? 0;
        const isSoldOut  = quota !== null && soldCount >= quota;
        const remaining  = quota !== null ? Math.max(0, quota - soldCount) : null;

        return {
            id:               pkg.id.toString(),
            gameId:           pkg.gameId.toString(),
            sku:              pkg.sku,
            name:             pkg.name,
            description:      pkg.description,
            // ราคา
            price,
            originalPrice,
            cost,
            discount:         pkg.discount,
            effectivePrice,
            // กำไร
            profit:           Math.round(profit * 100) / 100,
            profitPercent:    profitPercent !== null ? Math.round(profitPercent * 10) / 10 : null,
            // Flash Sale
            flashSale: {
                isActive:    isFlashSaleActive,
                price:       flashSalePrice,
                start:       pkg.flashSaleStart,
                end:         pkg.flashSaleEnd,
            },
            // Quota
            quota: {
                limit:     quota,
                sold:      soldCount,
                remaining,
                isSoldOut,
            },
            isActive:   pkg.isActive,
            createdAt:  pkg.createdAt,
            updatedAt:  pkg.updatedAt,
        };
    }

    // ─── Helper: ตรวจสอบข้อมูล Flash Sale ────────────────────────────────────
    private validateFlashSale(data: any) {
        const { flashSalePrice, flashSaleStart, flashSaleEnd } = data;
        const hasPrice = flashSalePrice !== null && flashSalePrice !== undefined;
        const hasStart = flashSaleStart !== null && flashSaleStart !== undefined;
        const hasEnd   = flashSaleEnd   !== null && flashSaleEnd   !== undefined;

        // ถ้ามีบางส่วน ต้องมีครบทั้ง 3 อย่าง
        if ((hasPrice || hasStart || hasEnd) && !(hasPrice && hasStart && hasEnd)) {
            throw new BadRequestException('Flash Sale ต้องระบุ flashSalePrice, flashSaleStart, และ flashSaleEnd ครบทั้งหมด');
        }

        if (hasPrice && hasStart && hasEnd) {
            const start = new Date(flashSaleStart);
            const end   = new Date(flashSaleEnd);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new BadRequestException('รูปแบบวันที่ไม่ถูกต้อง ใช้ ISO 8601 เช่น 2026-05-12T10:00:00Z');
            }
            if (end <= start) {
                throw new BadRequestException('flashSaleEnd ต้องมาหลัง flashSaleStart');
            }
            if (Number(flashSalePrice) <= 0) {
                throw new BadRequestException('flashSalePrice ต้องมากกว่า 0');
            }
        }
    }
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CreatePackageDto {
    sku:             string;
    name:            string;
    description?:    string;
    price:           number;
    originalPrice?:  number;
    cost?:           number;
    discount?:       number;
    flashSalePrice?: number | null;
    flashSaleStart?: string | null;
    flashSaleEnd?:   string | null;
    quota?:          number | null;
    isActive?:       boolean;
}

export interface UpdatePackageDto {
    name?:           string;
    description?:    string | null;
    price?:          number;
    originalPrice?:  number;
    cost?:           number;
    discount?:       number;
    flashSalePrice?: number | null;
    flashSaleStart?: string | null;
    flashSaleEnd?:   string | null;
    quota?:          number | null;
    isActive?:       boolean;
}

export interface FlashSaleDto {
    flashSalePrice: number | null;   // null = ยกเลิก flash sale
    flashSaleStart?: string;
    flashSaleEnd?:   string;
}
