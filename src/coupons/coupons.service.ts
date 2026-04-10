import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CouponValidationResponseDto } from './dto/coupon-validation-response.dto';
import { Coupon, CouponUsage } from '@prisma/client';

@Injectable()
export class CouponsService {
    constructor(private prisma: PrismaService) {}

    /**
     * Create a new coupon
     */
    async createCoupon(createCouponDto: CreateCouponDto): Promise<Coupon> {
        const { startDate, expiryDate, ...rest } = createCouponDto;

        return this.prisma.coupon.create({
            data: {
                ...rest,
                startDate: new Date(startDate),
                expiryDate: new Date(expiryDate),
            },
        });
    }

    /**
     * Validate a coupon with comprehensive checks
     */
    async validateCoupon(
        validateDto: ValidateCouponDto,
        userId: bigint,
    ): Promise<CouponValidationResponseDto> {
        const { code, gameId, packageId, amount = 0 } = validateDto;
        const errors: string[] = [];

        try {
            // 1. Check if coupon exists
            const coupon = await this.prisma.coupon.findUnique({
                where: { code },
            });

            if (!coupon) {
                return {
                    success: false,
                    message: 'คูปองนี้ไม่มีอยู่ในระบบ',
                    errors: ['Coupon code not found'],
                };
            }

            // 2. Check if coupon is active
            if (!coupon.isActive) {
                return {
                    success: false,
                    message: 'คูปองนี้ไม่ได้ถูกเปิดใช้งาน',
                    errors: ['Coupon is inactive'],
                };
            }

            // 3. Check expiration date
            const now = new Date();
            if (now < coupon.startDate) {
                return {
                    success: false,
                    message: `คูปองนี้ยังไม่สามารถใช้งานได้ เริ่มใช้ได้วันที่ ${coupon.startDate.toLocaleDateString()}`,
                    errors: ['Coupon has not started yet'],
                };
            }

            if (now > coupon.expiryDate) {
                return {
                    success: false,
                    message: 'คูปองนี้หมดอายุแล้ว',
                    errors: ['Coupon has expired'],
                };
            }

            // 4. Check remaining usage count
            if (coupon.maximumUses > 0 && coupon.currentUsageCount >= coupon.maximumUses) {
                return {
                    success: false,
                    message: 'คูปองนี้ถูกใช้งานครบจำนวนที่กำหนดแล้ว',
                    errors: ['Coupon usage limit exceeded'],
                };
            }

            // 5. Check user-specific usage limit
            const userUsageCount = await this.prisma.couponUsage.count({
                where: {
                    couponId: coupon.id,
                    userId: userId,
                },
            });

            if (userUsageCount >= coupon.usagePerUser) {
                return {
                    success: false,
                    message: `คุณได้ใช้คูปองนี้แล้ว ${coupon.usagePerUser} ครั้ง ไม่สามารถใช้มากกว่านี้ได้`,
                    errors: ['User has reached maximum usage limit for this coupon'],
                };
            }

            // 6. Check applicable games (if specified)
            if (gameId && coupon.applicableGameIds.length > 0) {
                const applicableGameIds = coupon.applicableGameIds.map(id => BigInt(id));
                if (!applicableGameIds.includes(BigInt(gameId))) {
                    errors.push('This coupon is not applicable for the selected game');
                }
            }

            // 7. Check applicable packages (if specified)
            if (packageId && coupon.applicablePackageIds.length > 0) {
                const applicablePackageIds = coupon.applicablePackageIds.map(id => BigInt(id));
                if (!applicablePackageIds.includes(BigInt(packageId))) {
                    errors.push('This coupon is not applicable for the selected package');
                }
            }

            // 8. Check minimum amount
            if (amount > 0 && new Decimal(amount).lessThan(coupon.minimumAmount)) {
                const minAmount = coupon.minimumAmount.toString();
                errors.push(`Minimum purchase amount for this coupon is ${minAmount}`);
            }

            if (errors.length > 0) {
                return {
                    success: false,
                    message: 'คูปองนี้ไม่สามารถใช้งานได้ในกรณีนี้',
                    errors,
                };
            }

            // Calculate discount
            const { discountAmount, finalAmount } = this.calculateDiscount(
                amount,
                coupon.discountType,
                coupon.discountValue,
            );

            const usageRemaining = coupon.maximumUses > 0 
                ? Math.max(0, coupon.maximumUses - coupon.currentUsageCount - 1)
                : -1; // -1 means unlimited

            return {
                success: true,
                message: 'คูปองนี้สามารถใช้งานได้',
                data: {
                    code: coupon.code,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue.toNumber(),
                    discountAmount,
                    finalAmount,
                    usageRemaining,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: 'เกิดข้อผิดพลาดในการตรวจสอบคูปอง',
                errors: [error.message],
            };
        }
    }

    /**
     * Apply coupon to an order and record usage
     */
    async applyCoupon(
        code: string,
        userId: bigint,
        orderId: bigint,
        usedAmount: number,
        ipAddress?: string,
    ): Promise<CouponUsage> {
        const coupon = await this.prisma.coupon.findUnique({
            where: { code },
        });

        if (!coupon) {
            throw new BadRequestException('Coupon not found');
        }

        const { discountAmount } = this.calculateDiscount(
            usedAmount,
            coupon.discountType,
            coupon.discountValue,
        );

        // Record usage
        const usage = await this.prisma.couponUsage.create({
            data: {
                couponId: coupon.id,
                userId,
                orderId,
                usedAmount: new Decimal(usedAmount),
                discountAmount: new Decimal(discountAmount),
                ipAddress,
            },
        });

        // Update coupon usage count
        await this.prisma.coupon.update({
            where: { id: coupon.id },
            data: {
                currentUsageCount: coupon.currentUsageCount + 1,
            },
        });

        return usage;
    }

    /**
     * Get coupon by code
     */
    async getCoupon(code: string): Promise<Coupon> {
        const coupon = await this.prisma.coupon.findUnique({
            where: { code },
        });

        if (!coupon) {
            throw new BadRequestException('Coupon not found');
        }

        return coupon;
    }

    /**
     * Get all coupons (admin)
     */
    async getAllCoupons(): Promise<Coupon[]> {
        return this.prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get coupon usage history for a user
     */
    async getUserCouponHistory(userId: bigint): Promise<CouponUsage[]> {
        return this.prisma.couponUsage.findMany({
            where: { userId },
            orderBy: { usedAt: 'desc' },
            include: { coupon: true },
        });
    }

    /**
     * Update coupon
     */
    async updateCoupon(id: bigint, updateData: Partial<CreateCouponDto>): Promise<Coupon> {
        return this.prisma.coupon.update({
            where: { id },
            data: updateData,
        });
    }

    /**
     * Delete coupon
     */
    async deleteCoupon(id: bigint): Promise<void> {
        await this.prisma.coupon.delete({
            where: { id },
        });
    }

    /**
     * Calculate discount based on discount type
     */
    private calculateDiscount(
        amount: number,
        discountType: string,
        discountValue: any,
    ): { discountAmount: number; finalAmount: number } {
        const discountValueNum = Number(discountValue);
        let discountAmount = 0;

        if (discountType === 'FIXED') {
            discountAmount = discountValueNum;
        } else if (discountType === 'PERCENTAGE') {
            discountAmount = (amount * discountValueNum) / 100;
        }

        const finalAmount = Math.max(0, amount - discountAmount);

        return {
            discountAmount: Math.round(discountAmount * 100) / 100,
            finalAmount: Math.round(finalAmount * 100) / 100,
        };
    }
}
