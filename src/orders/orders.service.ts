import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService }  from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { TopupService }   from '../topup/topup.service';
import { CouponsService } from '../coupons/coupons.service';
import { OrderStatus }    from '@prisma/client';

function genOrderNumber() {
  return `CP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma:   PrismaService,
    private payment:  PaymentService,
    private topup:    TopupService,
    private coupons:  CouponsService,
  ) {}

  // ── CREATE ────────────────────────────────────────────────────
  async createOrder(dto: any, ipAddress?: string, userId?: string) {
    // Backend re-validate ราคา — ป้องกัน price manipulation
    const priceData = await this.topup.calculatePrice(
      dto.packageId, dto.couponCode, dto.buyerEmail, userId,
    );

    return this.prisma.order.create({
      data: {
        orderNumber:   genOrderNumber(),
        userId:        userId ?? null,
        gameId:        dto.gameId,
        packageId:     dto.packageId,
        buyerEmail:    dto.buyerEmail,
        gameAccountId: dto.gameAccountId,
        gameServer:    dto.gameServer    ?? null,
        gameUsername:  dto.gameUsername  ?? null,
        packageName:   priceData.packageName,
        amount:        priceData.amount,
        bonusAmount:   priceData.bonusAmount,
        currency:      priceData.currency,
        unitPrice:     priceData.originalPrice,
        totalPrice:    priceData.finalPrice,
        couponCode:    dto.couponCode    ?? null,
        couponDiscount: priceData.discountAmount > 0 ? priceData.discountAmount : null,
        pointsEarned:  priceData.pointsEarned,
      },
    });
  }

  // ── PAY ───────────────────────────────────────────────────────
  async payOrder(orderId: string, paymentProvider = 'mock', paymentDetails: any = {}) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING) throw new ConflictException(`Order is ${order.status}`);

    const payResult = await this.payment.processPayment(
      orderId, Number(order.totalPrice), paymentProvider, paymentDetails,
    );

    await this.prisma.$transaction(async (tx) => {
      const newStatus = payResult.success ? OrderStatus.PROCESSING : OrderStatus.FAILED;
      await tx.order.update({
        where: { id: orderId },
        data: {
          status:        newStatus,
          paymentMethod: payResult.success ? paymentProvider : null,
          paymentRef:    payResult.providerRef,
          paidAt:        payResult.success ? new Date() : null,
        },
      });
      await tx.orderStatusLog.create({
        data: { orderId, oldStatus: 'PENDING', newStatus, note: payResult.success ? 'Payment OK' : payResult.error },
      });
    });

    // บันทึก coupon usage + แต้ม
    if (payResult.success) {
      if (order.couponCode && order.userId) {
        const coupon = await this.prisma.coupon.findUnique({ where: { code: order.couponCode } });
        if (coupon) await this.coupons.recordUsage(coupon.id, order.buyerEmail, orderId, order.userId);
      }
      if (order.userId) {
        await this.topup.earnPoints(order.userId, orderId, Number(order.totalPrice));
      }
    }

    return {
      orderId,
      orderNumber: order.orderNumber,
      success:     payResult.success,
      message:     payResult.success ? 'ชำระเงินสำเร็จ' : payResult.error,
    };
  }

  // ── TRACK (public) ────────────────────────────────────────────
  async trackByOrderNumber(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where:   { orderNumber },
      include: { game: { select: { name: true, slug: true } }, statusLogs: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // ── USER ORDERS ───────────────────────────────────────────────
  async findByUser(userId: string, page = 1, limit = 10) {
    const [total, data] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { userId } }),
      this.prisma.order.findMany({
        where: { userId }, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { game: { select: { name: true, slug: true, image: true, accent: true } } },
      }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ── ADMIN ─────────────────────────────────────────────────────
  async listOrders(page = 1, limit = 20, status?: OrderStatus) {
    const where: any = status ? { status } : {};
    const [total, data] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { game: { select: { name: true } } },
      }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateStatus(orderId: string, status: OrderStatus, note?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
    if (!order) throw new NotFoundException('Order not found');
    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data:  { status, ...(status === 'COMPLETED' ? { deliveredAt: new Date() } : {}), ...(note ? { deliveryNote: note } : {}) },
      }),
      this.prisma.orderStatusLog.create({
        data: { orderId, oldStatus: order.status, newStatus: status, note, createdBy: 'admin' },
      }),
    ]);
    return { orderId, oldStatus: order.status, newStatus: status };
  }
}
