import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ValidateTopupDto, ValidateTopupResponseDto, PlayerFieldDto } from './dto/validate-topup.dto';
import { CouponsService } from '../coupons/coupons.service';

/**
 * บริการสำหรับตรวจสอบข้อมูล Top-up ก่อนสร้างคำสั่งซื้อ
 * Service for validating top-up data before creating order
 */
@Injectable()
export class TopupValidationService {
    constructor(
        private prisma: PrismaService,
        private couponsService: CouponsService,
    ) {}

    /**
     * ตรวจสอบข้อมูล Top-up ทั้งหมด
     * Validate all top-up information
     */
    async validateTopup(
        validateDto: ValidateTopupDto,
        userId: bigint,
    ): Promise<ValidateTopupResponseDto> {
        const { gameId, packageId, email, playerFields, couponCode } = validateDto;
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // 1. ตรวจสอบว่าเกมมีอยู่
            // 1. Validate game exists
            const game = await this.prisma.game.findUnique({
                where: { id: BigInt(gameId) },
                include: { packages: true },
            });

            if (!game) {
                return {
                    success: false,
                    message: 'ไม่พบเกมที่รองรับ',
                    errors: ['Game not found'],
                };
            }

            if (!game.isActive) {
                return {
                    success: false,
                    message: 'เกมไม่ได้ใช้งานในขณะนี้',
                    errors: ['Game is not active'],
                };
            }

            // 2. ตรวจสอบว่าแพ็กเกจมีอยู่
            // 2. Validate package exists
            const gamePackage = game.packages.find(p => p.id === BigInt(packageId));

            if (!gamePackage) {
                return {
                    success: false,
                    message: 'ไม่พบแพ็กเกจที่รองรับสำหรับเกมนี้',
                    errors: ['Package not found for this game'],
                };
            }

            if (!gamePackage.isActive) {
                return {
                    success: false,
                    message: 'แพ็กเกจนี้ไม่ได้ใช้งานในขณะนี้',
                    errors: ['Package is not active'],
                };
            }

            // 3. ตรวจสอบอีเมล
            // 3. Validate email
            const emailValid = this.validateEmail(email);
            if (!emailValid) {
                errors.push('อีเมลไม่ถูกต้อง');
                errors.push('Invalid email format');
            }

            // 4. ตรวจสอบฟิลด์ของผู้เล่น
            // 4. Validate player fields
            const playerFieldsValidation = await this.validatePlayerFields(
                gameId,
                playerFields,
            );

            if (!playerFieldsValidation.valid) {
                errors.push(...playerFieldsValidation.errors);
            }

            // 5. ตรวจสอบคูปอง (ถ้ามี)
            // 5. Validate coupon (if provided)
            let couponData = null;
            if (couponCode) {
                const couponValidation = await this.couponsService.validateCoupon(
                    { code: couponCode, gameId, packageId, amount: gamePackage.price.toNumber() },
                    userId,
                );

                if (!couponValidation.success) {
                    warnings.push(`คูปอง: ${couponValidation.message}`);
                } else {
                    couponData = couponValidation.data;
                }
            }

            // หากมีข้อผิดพลาด ส่งคำตอบที่ล้มเหลว
            // If there are errors, return failed response
            if (errors.length > 0) {
                return {
                    success: false,
                    message: 'การตรวจสอบข้อมูล Top-up ล้มเหลว',
                    errors,
                    warnings: warnings.length > 0 ? warnings : undefined,
                };
            }

            // ถ้าสำเร็จ รวบรวมข้อมูลการตอบสนอง
            // If successful, compile response data
            const estimatedPrice = couponData
                ? couponData.finalAmount
                : gamePackage.price.toNumber();

            return {
                success: true,
                message: 'ข้อมูล Top-up ถูกต้องและพร้อมสร้างคำสั่งซื้อ',
                data: {
                    gameId: Number(game.id),
                    gameName: game.name,
                    packageId: Number(gamePackage.id),
                    packageName: gamePackage.name,
                    packagePrice: gamePackage.price.toNumber(),
                    email,
                    playerFieldsValid: playerFieldsValidation.valid,
                    couponApplied: couponData
                        ? {
                              code: couponData.code,
                              discountAmount: couponData.discountAmount,
                              finalPrice: couponData.finalAmount,
                          }
                        : undefined,
                    estimatedPrice,
                },
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล Top-up',
                errors: [errorMessage],
            };
        }
    }

    /**
     * ตรวจสอบรูปแบบอีเมล
     * Validate email format
     */
    private validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * ตรวจสอบฟิลด์ของผู้เล่น
     * Validate player fields based on game requirements
     */
    private async validatePlayerFields(
        gameId: number,
        playerFields: PlayerFieldDto[],
    ): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];

        try {
            // ดึงข้อมูลฟิลด์ที่จำเป็นสำหรับเกมนี้
            // Get required fields for this game
            const requiredFields = await this.prisma.gameInputField.findMany({
                where: {
                    gameId: BigInt(gameId),
                    required: true,
                    isActive: true,
                },
            });

            // ตรวจสอบว่าฟิลด์ที่จำเป็นทั้งหมดมีอยู่
            // Check if all required fields are provided
            for (const requiredField of requiredFields) {
                const providedField = playerFields.find(f => f.key === requiredField.key);

                if (!providedField) {
                    errors.push(`ฟิลด์ที่จำเป็น "${requiredField.label}" หายไป`);
                    errors.push(`Required field "${requiredField.label}" is missing`);
                    continue;
                }

                // ตรวจสอบค่าด้วย regex (ถ้ามี)
                // Validate value with regex if available
                if (requiredField.regex) {
                    const regex = new RegExp(requiredField.regex);
                    if (!regex.test(providedField.value)) {
                        errors.push(
                            `ค่าของ "${requiredField.label}" ไม่ถูกต้อง: ${requiredField.helpText || 'ตรวจสอบรูปแบบ'}`,
                        );
                        errors.push(
                            `Invalid value for "${requiredField.label}": ${requiredField.helpText || 'Check format'}`,
                        );
                    }
                }
            }

            return {
                valid: errors.length === 0,
                errors,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                valid: false,
                errors: [
                    'ไม่สามารถตรวจสอบฟิลด์ของผู้เล่น',
                    `Cannot validate player fields: ${errorMessage}`,
                ],
            };
        }
    }

    /**
     * ใช้งานการตรวจสอบและสร้างคำสั่งซื้อ
     * Apply validation and create order
     */
    async createOrderWithValidation(
        validateDto: ValidateTopupDto,
        userId: bigint,
    ) {
        // ตรวจสอบข้อมูลก่อน
        // Validate first
        const validation = await this.validateTopup(validateDto, userId);

        if (!validation.success) {
            throw new BadRequestException({
                message: validation.message,
                errors: validation.errors,
            });
        }

        // ข้อมูลการตรวจสอบสำเร็จ สามารถสร้างคำสั่งซื้อได้
        // Validation passed, ready to create order
        return {
            validated: true,
            data: validation.data,
            message: 'พร้อมสร้างคำสั่งซื้อ',
        };
    }

    /**
     * เตรียมข้อมูลคำสั่งซื้อสำหรับหน้าชำระเงิน
     * Order Preparation for Payment - ส่งข้อมูลทั้งหมดที่จำเป็นสำหรับการชำระเงิน
     * Prepare order data for payment page with all necessary details
     */
    async prepareOrderForPayment(
        orderId: bigint,
        userId: bigint,
    ): Promise<{
        success: boolean;
        message: string;
        data?: {
            orderId: number;
            orderDetails: {
                gameName: string;
                packageName: string;
                packageDescription?: string;
            };
            packageId: number;
            playerInformation: {
                userId: number;
                email: string;
                gameUid?: string;
            };
            email: string;
            couponCode?: string;
            amounts: {
                originalPrice: number;
                discountAmount: number;
                finalPrice: number;
            };
            createdAt: string;
            status: string;
        };
        errors?: string[];
    }> {
        try {
            // ดึงข้อมูลคำสั่งซื้อพร้อมความสัมพันธ์
            // Fetch order with all related data
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
                include: {
                    user: true,
                    game: true,
                    package: true,
                },
            });

            if (!order) {
                return {
                    success: false,
                    message: 'ไม่พบคำสั่งซื้อ | Order not found',
                    errors: ['Order ID not found in database'],
                };
            }

            if (order.userId !== userId) {
                return {
                    success: false,
                    message: 'ไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้ | Unauthorized access',
                    errors: ['This order does not belong to the current user'],
                };
            }

            // ดึงข้อมูลคูปองหากมี
            // Fetch coupon data if exists
            const couponUsage = await (this.prisma as any).couponUsage.findFirst({
                where: { orderId: orderId },
                include: { coupon: true },
            });

            // ค้นหาข้อมูลผู้เล่น (UID) จากคำสั่งซื้อ
            // Get player information from order
            const playerInfo = {
                userId: Number(order.userId),
                email: order.user?.email || '',
                gameUid: order.uid || '',
            };

            // คำนวณยอดเงิน
            // Calculate amounts
            const originalPrice = order.packagePrice.toNumber();
            const discountAmount = couponUsage ? couponUsage.discountAmount.toNumber() : 0;
            const finalPrice = originalPrice - discountAmount;

            // รวบรวมข้อมูลสำหรับหน้าชำระเงิน
            // Compile payment preparation data
            return {
                success: true,
                message: 'เตรียมข้อมูลคำสั่งซื้อสำหรับชำระเงินสำเร็จ | Order prepared for payment',
                data: {
                    orderId: Number(order.id),
                    orderDetails: {
                        gameName: order.gameName,
                        packageName: order.packageName,
                        packageDescription: order.package?.description || undefined,
                    },
                    packageId: Number(order.packageId),
                    playerInformation: playerInfo,
                    email: playerInfo.email,
                    couponCode: couponUsage?.coupon?.code || undefined,
                    amounts: {
                        originalPrice,
                        discountAmount,
                        finalPrice,
                    },
                    createdAt: order.createdAt.toISOString(),
                    status: order.status,
                },
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: 'เกิดข้อผิดพลาดในการเตรียมข้อมูลชำระเงิน | Error preparing payment data',
                errors: [errorMessage],
            };
        }
    }
}
