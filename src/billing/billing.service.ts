import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { ReturnsService } from '../returns/returns.service';
import { BillingPreviewDto } from './dto/billing-preview.dto';
import { BillingCheckoutDto } from './dto/billing-checkout.dto';
import { ScanItemDto, UpdateItemQtyDto, CartCheckoutDto } from './dto/billing-cart.dto';
import { CreateReturnDto } from '../returns/dto/create-return.dto';

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private couponsService: CouponsService,
    private returnsService: ReturnsService,
  ) {}

  // ─── Internal Helpers ────────────────────────────────────────────────────────

  /** Load biller user and validate branch assignment. Returns user with branchId guaranteed. */
  private async getBillerUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.branchId) throw new BadRequestException('Biller has no branch assigned');
    return user as typeof user & { branchId: bigint };
  }

  /** Get or auto-create the biller's single DRAFT invoice (cart). */
  private async getOrCreateDraft(userId: number, branchId: bigint, gstPercent = 0) {
    const existing = await this.prisma.invoice.findFirst({
      where: { userId: BigInt(userId), status: 'DRAFT' },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        billingSession: true,
      },
    });
    if (existing) return existing;

    return this.prisma.invoice.create({
      data: {
        invoiceNumber: `DRAFT-${userId}-${Date.now()}`,
        branchId,
        userId: BigInt(userId),
        subtotal: 0,
        discount: 0,
        tax: 0,
        finalAmount: 0,
        status: 'DRAFT',
        billingSession: { create: { gstPercent } },
      },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        billingSession: true,
      },
    });
  }

  /** Build running summary from a draft invoice */
  private buildSummary(invoice: any) {
    const gstPercent = invoice.billingSession?.gstPercent ?? 0;
    const subtotal = invoice.items.reduce(
      (s: number, i: any) => s + Number(i.price) * i.quantity,
      0,
    );
    const gstAmount = parseFloat(((subtotal * gstPercent) / 100).toFixed(2));
    const finalAmount = parseFloat((subtotal + gstAmount).toFixed(2));

    return {
      cartId: Number(invoice.id),
      gstPercent,
      items: invoice.items.map((i: any) => ({
        variantId: Number(i.variantId),
        sku: i.variant.sku,
        size: i.variant.size,
        color: i.variant.color,
        productName: i.variant.product.name,
        price: Number(i.price),
        quantity: i.quantity,
        lineTotal: Number(i.price) * i.quantity,
      })),
      subtotal,
      gstAmount,
      finalAmount,
    };
  }

  private async resolveCustomer(phone: string, name?: string, email?: string, address?: string) {
    const existing = await this.prisma.customer.findFirst({ where: { phone } });
    if (existing) return existing;
    if (!name) throw new BadRequestException(`No customer found with phone ${phone}. Provide customerName to create one.`);
    return this.prisma.customer.create({ data: { phone, name, email, address } });
  }

  // ─── Customer Lookup ─────────────────────────────────────────────────────────

  async lookupCustomer(phone: string) {
    return (await this.prisma.customer.findFirst({
      where: { phone },
      include: { _count: { select: { invoices: true, returns: true } } },
    })) ?? null;
  }

  // ─── Product Search / Scan ───────────────────────────────────────────────────

  async searchProduct(q: string, userId: number) {
    const user = await this.getBillerUser(userId);
    const variants = await this.prisma.productVariant.findMany({
      where: {
        OR: [
          { sku: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { product: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: {
        product: { include: { category: true } },
        inventory: { where: { branchId: user.branchId } },
      },
      take: 20,
    });
    return variants.map((v) => this.formatVariantResult(v));
  }

  async scanBarcode(barcode: string, userId: number) {
    const user = await this.getBillerUser(userId);
    const variant = await this.prisma.productVariant.findUnique({
      where: { barcode },
      include: {
        product: { include: { category: true } },
        inventory: { where: { branchId: user.branchId } },
      },
    });
    if (!variant) throw new NotFoundException(`No product found with barcode: ${barcode}`);
    return this.formatVariantResult(variant);
  }

  private formatVariantResult(variant: any) {
    const stockEntry = variant.inventory?.[0];
    return {
      variantId: Number(variant.id),
      sku: variant.sku,
      barcode: variant.barcode,
      size: variant.size,
      color: variant.color,
      sellingPrice: Number(variant.sellingPrice),
      costPrice: Number(variant.costPrice),
      stockQty: stockEntry ? stockEntry.stockQuantity : 0,
      inStock: stockEntry ? stockEntry.stockQuantity > 0 : false,
      product: {
        id: Number(variant.product.id),
        name: variant.product.name,
        description: variant.product.description,
        category: variant.product.category?.name ?? null,
      },
    };
  }

  // ─── Cart — Biller Draft ──────────────────────────────────────────────────────

  async getCart(userId: number) {
    const draft = await this.prisma.invoice.findFirst({
      where: { userId: BigInt(userId), status: 'DRAFT' },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        billingSession: true,
      },
    });
    if (!draft) return { cartId: null, gstPercent: 0, items: [], subtotal: 0, gstAmount: 0, finalAmount: 0 };
    return this.buildSummary(draft);
  }

  async scanItem(userId: number, dto: ScanItemDto) {
    const user = await this.getBillerUser(userId);
    const draft = await this.getOrCreateDraft(userId, user.branchId, dto.gstPercent ?? 0);

    if (dto.gstPercent !== undefined && dto.gstPercent !== draft.billingSession?.gstPercent) {
      await this.prisma.billingSession.update({
        where: { invoiceId: draft.id },
        data: { gstPercent: dto.gstPercent },
      });
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { barcode: dto.barcode },
      include: {
        product: true,
        inventory: { where: { branchId: user.branchId } },
      },
    });
    if (!variant) throw new NotFoundException(`No product found with barcode: ${dto.barcode}`);

    const stock = variant.inventory?.[0];
    if (!stock || stock.stockQuantity <= 0) {
      throw new BadRequestException(`"${variant.product.name}" (SKU: ${variant.sku}) is out of stock`);
    }

    const existingItem = draft.items.find(
      (i: any) => i.variantId.toString() === variant.id.toString(),
    );

    if (existingItem) {
      const newQty = existingItem.quantity + 1;
      if (stock.stockQuantity < newQty) {
        throw new BadRequestException(`Only ${stock.stockQuantity} units of "${variant.product.name}" available`);
      }
      await this.prisma.invoiceItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await this.prisma.invoiceItem.create({
        data: {
          invoiceId: draft.id,
          variantId: variant.id,
          quantity: 1,
          price: variant.sellingPrice,
          subtotal: variant.sellingPrice,
        },
      });
    }

    const fresh = await this.prisma.invoice.findUnique({
      where: { id: draft.id },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        billingSession: true,
      },
    });
    return this.buildSummary(fresh);
  }

  async updateCartItem(userId: number, variantId: number, dto: UpdateItemQtyDto) {
    const user = await this.getBillerUser(userId);
    const draft = await this.prisma.invoice.findFirst({
      where: { userId: BigInt(userId), status: 'DRAFT' },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        billingSession: true,
      },
    });
    if (!draft) throw new NotFoundException('No active cart. Scan a product first.');

    const item = draft.items.find((i: any) => i.variantId.toString() === variantId.toString());
    if (!item) throw new NotFoundException(`Variant ${variantId} is not in your cart`);

    if (dto.quantity === 0) {
      await this.prisma.invoiceItem.delete({ where: { id: item.id } });
    } else {
      const stock = await this.prisma.inventory.findUnique({
        where: { variantId_branchId: { variantId: BigInt(variantId), branchId: user.branchId } },
      });
      if (!stock || stock.stockQuantity < dto.quantity) {
        throw new BadRequestException(`Only ${stock?.stockQuantity ?? 0} units available`);
      }
      await this.prisma.invoiceItem.update({ where: { id: item.id }, data: { quantity: dto.quantity } });
    }

    const fresh = await this.prisma.invoice.findUnique({
      where: { id: draft.id },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        billingSession: true,
      },
    });
    return this.buildSummary(fresh);
  }

  async clearCart(userId: number) {
    const draft = await this.prisma.invoice.findFirst({ where: { userId: BigInt(userId), status: 'DRAFT' } });
    if (!draft) return { message: 'No active cart to clear' };
    await this.prisma.billingSession.deleteMany({ where: { invoiceId: draft.id } });
    await this.prisma.invoiceItem.deleteMany({ where: { invoiceId: draft.id } });
    await this.prisma.invoice.delete({ where: { id: draft.id } });
    return { message: 'Cart cleared successfully' };
  }

  async checkoutCart(userId: number, dto: CartCheckoutDto) {
    const user = await this.getBillerUser(userId);
    const draft = await this.prisma.invoice.findFirst({
      where: { userId: BigInt(userId), status: 'DRAFT' },
      include: { items: { include: { variant: true } }, billingSession: true },
    });
    if (!draft) throw new NotFoundException('No active cart. Scan products first.');
    if (draft.items.length === 0) throw new BadRequestException('Cart is empty');

    const gstPercent = draft.billingSession?.gstPercent ?? 0;
    const subtotal = draft.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
    let discount = 0;
    let couponId: bigint | undefined;

    if (dto.couponCode) {
      const result = await this.couponsService.validate(dto.couponCode, subtotal);
      discount = result.discount;
      couponId = result.coupon.id;
    }

    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax = parseFloat(((discountedSubtotal * gstPercent) / 100).toFixed(2));
    const finalAmount = parseFloat((discountedSubtotal + tax).toFixed(2));

    let customerId: bigint | null = null;
    if (dto.customerPhone) {
      const customer = await this.resolveCustomer(dto.customerPhone, dto.customerName, dto.customerEmail, dto.customerAddress);
      customerId = customer.id;
    }

    const invoice = await this.prisma.$transaction(async (tx) => {
      for (const item of draft.items) {
        const inv = await tx.inventory.findUnique({
          where: { variantId_branchId: { variantId: item.variantId, branchId: user.branchId } },
        });
        if (!inv || inv.stockQuantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for variant ${item.variantId}`);
        }
      }

      const voucherCodes = dto.voucherCodes ?? [];
      for (const code of voucherCodes) {
        const voucher = await tx.voucher.findUnique({ where: { voucherCode: code } });
        if (!voucher) throw new NotFoundException(`Voucher "${code}" not found`);
        if (voucher.invoiceId !== null) throw new BadRequestException(`Voucher "${code}" already redeemed`);
      }

      const updated = await tx.invoice.update({
        where: { id: draft.id },
        data: {
          invoiceNumber: `INV-${Date.now().toString().slice(-8)}`,
          customerId,
          couponId: couponId ? BigInt(couponId) : null,
          subtotal, discount, tax, finalAmount,
          status: 'COMPLETED',
          items: {
            updateMany: draft.items.map((i) => ({
              where: { id: i.id },
              data: { subtotal: Number(i.price) * i.quantity },
            })),
          },
        },
        include: { items: true },
      });

      for (const item of draft.items) {
        await tx.inventory.update({
          where: { variantId_branchId: { variantId: item.variantId, branchId: user.branchId } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: { variantId: item.variantId, branchId: user.branchId, type: 'SALE', quantity: -item.quantity, referenceId: updated.id },
        });
      }

      if (dto.couponCode && couponId) {
        await tx.couponUsage.create({ data: { couponId: BigInt(couponId), invoiceId: updated.id, customerId } });
        await tx.coupon.update({ where: { id: BigInt(couponId) }, data: { usedCount: { increment: 1 } } });
      }

      for (const code of (dto.voucherCodes ?? [])) {
        await tx.voucher.update({ where: { voucherCode: code }, data: { invoiceId: updated.id } });
      }

      await tx.payment.create({ data: { invoiceId: updated.id, paymentMethod: dto.paymentMethod, amount: finalAmount } });
      await tx.billingSession.deleteMany({ where: { invoiceId: updated.id } });
      return updated;
    });

    return this.prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        customer: true, branch: true,
        user: { select: { id: true, name: true, email: true } },
        coupon: true,
        items: { include: { variant: { include: { product: true } } } },
        vouchers: { include: { campaign: true } },
        payments: true,
      },
    });
  }

  // ─── Stateless Preview ────────────────────────────────────────────────────────

  async previewBill(userId: number, dto: BillingPreviewDto) {
    const user = await this.getBillerUser(userId);
    const gstPercent = dto.gstPercent ?? 0;
    const resolvedItems: any[] = [];

    for (const item of dto.items) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: BigInt(item.variantId) },
        include: {
          product: true,
          inventory: { where: { branchId: user.branchId } },
        },
      });
      if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found`);

      const stockEntry = variant.inventory?.[0];
      if (!stockEntry || stockEntry.stockQuantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${variant.product.name}" (SKU: ${variant.sku}). Available: ${stockEntry?.stockQuantity ?? 0}`,
        );
      }

      const price = Number(variant.sellingPrice);
      resolvedItems.push({
        variantId: item.variantId,
        quantity: item.quantity,
        price,
        subtotal: price * item.quantity,
        variantInfo: { sku: variant.sku, size: variant.size, color: variant.color, productName: variant.product.name },
      });
    }

    const subtotal = resolvedItems.reduce((s, i) => s + i.subtotal, 0);
    let discount = 0;
    let couponDetails: any = null;

    if (dto.couponCode) {
      const result = await this.couponsService.validate(dto.couponCode, subtotal);
      discount = result.discount;
      couponDetails = { code: result.coupon.code, discountType: result.coupon.discountType, discountValue: Number(result.coupon.discountValue), discountApplied: discount };
    }

    const discountedSubtotal = Math.max(0, subtotal - discount);
    const gstAmount = parseFloat(((discountedSubtotal * gstPercent) / 100).toFixed(2));
    const finalAmount = parseFloat((discountedSubtotal + gstAmount).toFixed(2));

    return {
      items: resolvedItems.map(({ variantInfo, ...rest }) => ({ ...rest, ...variantInfo })),
      subtotal, coupon: couponDetails, discount, gstPercent, gstAmount, finalAmount,
    };
  }

  // ─── Stateless Direct Checkout ────────────────────────────────────────────────

  async checkout(userId: number, dto: BillingCheckoutDto) {
    const user = await this.getBillerUser(userId);
    const gstPercent = dto.gstPercent ?? 0;

    const customer = await this.resolveCustomer(dto.customerPhone, dto.customerName, dto.customerEmail, dto.customerAddress);
    const subtotal = dto.items.reduce((s, i) => s + i.quantity * i.price, 0);
    let discount = 0;
    let couponId: bigint | undefined;

    if (dto.couponCode) {
      const result = await this.couponsService.validate(dto.couponCode, subtotal);
      discount = result.discount;
      couponId = result.coupon.id;
    }

    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax = parseFloat(((discountedSubtotal * gstPercent) / 100).toFixed(2));
    const finalAmount = parseFloat((discountedSubtotal + tax).toFixed(2));

    const invoice = await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const inv = await tx.inventory.findUnique({
          where: { variantId_branchId: { variantId: BigInt(item.variantId), branchId: user.branchId } },
        });
        if (!inv || inv.stockQuantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for variant ${item.variantId}`);
        }
      }

      for (const code of (dto.voucherCodes ?? [])) {
        const voucher = await tx.voucher.findUnique({ where: { voucherCode: code } });
        if (!voucher) throw new NotFoundException(`Voucher "${code}" not found`);
        if (voucher.invoiceId !== null) throw new BadRequestException(`Voucher "${code}" already redeemed`);
      }

      const created = await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now().toString().slice(-8)}`,
          customerId: customer.id,
          branchId: user.branchId,
          userId: BigInt(userId),
          couponId: couponId ? BigInt(couponId) : null,
          subtotal, discount, tax, finalAmount,
          status: 'COMPLETED',
          items: {
            create: dto.items.map((item) => ({
              variantId: BigInt(item.variantId),
              quantity: item.quantity,
              price: item.price,
              subtotal: item.quantity * item.price,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of dto.items) {
        await tx.inventory.update({
          where: { variantId_branchId: { variantId: BigInt(item.variantId), branchId: user.branchId } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: { variantId: BigInt(item.variantId), branchId: user.branchId, type: 'SALE', quantity: -item.quantity, referenceId: created.id },
        });
      }

      if (dto.couponCode && couponId) {
        await tx.couponUsage.create({ data: { couponId: BigInt(couponId), invoiceId: created.id, customerId: customer.id } });
        await tx.coupon.update({ where: { id: BigInt(couponId) }, data: { usedCount: { increment: 1 } } });
      }

      for (const code of (dto.voucherCodes ?? [])) {
        await tx.voucher.update({ where: { voucherCode: code }, data: { invoiceId: created.id } });
      }
      await tx.payment.create({ data: { invoiceId: created.id, paymentMethod: dto.paymentMethod, amount: finalAmount } });
      return created;
    });

    return this.prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        customer: true, branch: true,
        user: { select: { id: true, name: true, email: true } },
        coupon: true,
        items: { include: { variant: { include: { product: true } } } },
        vouchers: { include: { campaign: true } },
        payments: true,
      },
    });
  }

  // ─── History ──────────────────────────────────────────────────────────────────

  async myInvoices(userId: number, status?: string, search?: string, from?: string, to?: string, page = 1, limit = 20) {
    const user = await this.getBillerUser(userId);
    const skip = (page - 1) * limit;
    const where: any = { branchId: user.branchId };

    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); where.createdAt.lte = d; }
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const [total, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where, skip, take: limit,
        include: { customer: true, user: { select: { id: true, name: true } }, coupon: true, items: { include: { variant: { include: { product: true } } } }, payments: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { data: invoices, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async myReturns(userId: number) {
    const user = await this.getBillerUser(userId);
    return this.prisma.return.findMany({
      where: { branchId: user.branchId, returnType: 'INVOICE' },
      include: { customer: true, items: { include: { variant: { include: { product: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async shopStock(userId: number, search?: string) {
    const user = await this.getBillerUser(userId);
    const where: any = { branchId: user.branchId };
    if (search) {
      where.variant = { OR: [{ sku: { contains: search, mode: 'insensitive' } }, { product: { name: { contains: search, mode: 'insensitive' } } }] };
    }
    return this.prisma.inventory.findMany({
      where,
      include: { variant: { include: { product: { include: { category: true } } } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async analytics(userId: number, from?: string, to?: string) {
    const user = await this.getBillerUser(userId);
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); dateFilter.lte = d; }

    const invoiceWhere: any = { branchId: user.branchId, status: 'COMPLETED', ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) };
    const returnWhere: any = { branchId: user.branchId, returnType: 'INVOICE', ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) };

    const [invoices, returns, topVariants] = await Promise.all([
      this.prisma.invoice.findMany({ where: invoiceWhere, include: { items: true, payments: true }, orderBy: { createdAt: 'asc' } }),
      this.prisma.return.findMany({ where: returnWhere, include: { items: true } }),
      this.prisma.invoiceItem.groupBy({ by: ['variantId'], where: { invoice: invoiceWhere }, _sum: { quantity: true, subtotal: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 }),
    ]);

    const topSellerDetails = await Promise.all(
      topVariants.map(async (tv) => {
        const variant = await this.prisma.productVariant.findUnique({ where: { id: tv.variantId }, include: { product: true } });
        return { variantId: Number(tv.variantId), sku: variant?.sku, size: variant?.size, color: variant?.color, productName: variant?.product?.name, totalQtySold: tv._sum.quantity ?? 0, totalRevenue: Number(tv._sum.subtotal ?? 0) };
      }),
    );

    const dayMap: Record<string, any> = {};
    for (const inv of invoices) {
      const day = inv.createdAt.toISOString().slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { date: day, sales: 0, orders: 0 };
      dayMap[day].sales += Number(inv.finalAmount);
      dayMap[day].orders += 1;
    }

    return {
      summary: {
        totalInvoices: invoices.length,
        totalRevenue: invoices.reduce((s, i) => s + Number(i.finalAmount), 0),
        totalDiscount: invoices.reduce((s, i) => s + Number(i.discount), 0),
        totalRefunds: returns.reduce((s, r) => s + Number(r.totalRefund), 0),
        netRevenue: invoices.reduce((s, i) => s + Number(i.finalAmount), 0) - returns.reduce((s, r) => s + Number(r.totalRefund), 0),
        totalItemsSold: invoices.reduce((s, i) => s + i.items.reduce((si, item) => si + item.quantity, 0), 0),
        totalReturns: returns.length,
      },
      topSellers: topSellerDetails,
      dailySales: Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async createReturn(dto: CreateReturnDto) {
    return this.returnsService.create(dto);
  }
}
