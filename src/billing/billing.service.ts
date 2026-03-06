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
import { CreateReturnDto } from '../returns/dto/create-return.dto';

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private couponsService: CouponsService,
    private returnsService: ReturnsService,
  ) {}

  // ─── Customer Helpers ────────────────────────────────────────────────────────

  async lookupCustomer(phone: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { phone },
      include: {
        _count: { select: { invoices: true, returns: true } },
      },
    });
    return customer ?? null;
  }

  /**
   * Internal: find customer by phone or create a new one.
   * Used automatically during checkout.
   */
  private async resolveCustomer(
    phone: string,
    name?: string,
    email?: string,
    address?: string,
  ) {
    const existing = await this.prisma.customer.findFirst({ where: { phone } });
    if (existing) return existing;

    if (!name) {
      throw new BadRequestException(
        `No customer found with phone ${phone}. Provide customerName to create a new one.`,
      );
    }

    return this.prisma.customer.create({
      data: { phone, name, email, address },
    });
  }

  // ─── Product Search / Scan ───────────────────────────────────────────────────

  /**
   * Search variants by product name, SKU, or barcode.
   * Returns each variant with its stock at the given branchId.
   */
  async searchProduct(q: string, branchId: number) {
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
        inventory: {
          where: { branchId: BigInt(branchId) },
        },
      },
      take: 20,
    });

    return variants.map((v) => this.formatVariantResult(v));
  }

  /**
   * Look up a single variant by exact barcode.
   */
  async scanBarcode(barcode: string, branchId: number) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { barcode },
      include: {
        product: { include: { category: true } },
        inventory: {
          where: { branchId: BigInt(branchId) },
        },
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

  // ─── Price Preview ───────────────────────────────────────────────────────────

  /**
   * Calculates the bill total without saving anything.
   * Call this every time an item is added or removed.
   * Fetches current selling price from DB — frontend only sends variantId + qty.
   */
  async previewBill(dto: BillingPreviewDto) {
    const gstPercent = dto.gstPercent ?? 0;

    const resolvedItems: {
      variantId: number;
      quantity: number;
      price: number;
      subtotal: number;
      variantInfo: any;
    }[] = [];

    for (const item of dto.items) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: BigInt(item.variantId) },
        include: {
          product: true,
          inventory: { where: { branchId: BigInt(dto.branchId) } },
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
        variantInfo: {
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          productName: variant.product.name,
        },
      });
    }

    const subtotal = resolvedItems.reduce((s, i) => s + i.subtotal, 0);
    let discount = 0;
    let couponDetails: any = null;

    // Apply coupon discount
    if (dto.couponCode) {
      const result = await this.couponsService.validate(dto.couponCode, subtotal);
      discount = result.discount;
      couponDetails = {
        code: result.coupon.code,
        discountType: result.coupon.discountType,
        discountValue: Number(result.coupon.discountValue),
        discountApplied: discount,
      };
    }

    const discountedSubtotal = Math.max(0, subtotal - discount);
    const gstAmount = parseFloat(((discountedSubtotal * gstPercent) / 100).toFixed(2));
    const finalAmount = parseFloat((discountedSubtotal + gstAmount).toFixed(2));

    return {
      items: resolvedItems.map(({ variantInfo, ...rest }) => ({ ...rest, ...variantInfo })),
      subtotal,
      coupon: couponDetails,
      discount,
      gstPercent,
      gstAmount,
      finalAmount,
    };
  }

  // ─── Checkout (Create Invoice) ───────────────────────────────────────────────

  async checkout(dto: BillingCheckoutDto) {
    const gstPercent = dto.gstPercent ?? 0;

    // Resolve or create customer by phone
    const customer = await this.resolveCustomer(
      dto.customerPhone,
      dto.customerName,
      dto.customerEmail,
      dto.customerAddress,
    );

    // Compute totals
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
      // Stock validation
      for (const item of dto.items) {
        const inv = await tx.inventory.findUnique({
          where: {
            variantId_branchId: {
              variantId: BigInt(item.variantId),
              branchId: BigInt(dto.branchId),
            },
          },
        });
        if (!inv || inv.stockQuantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for variant ${item.variantId}`);
        }
      }

      // Validate all voucher codes before creating the invoice
      const voucherCodes = dto.voucherCodes ?? [];
      for (const code of voucherCodes) {
        const voucher = await tx.voucher.findUnique({ where: { voucherCode: code } });
        if (!voucher) {
          throw new NotFoundException(`Voucher code "${code}" not found`);
        }
        if (voucher.invoiceId !== null) {
          throw new BadRequestException(`Voucher "${code}" has already been redeemed against invoice #${voucher.invoiceId}`);
        }
      }

      // Create invoice
      const created = await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now().toString().slice(-8)}`,
          customerId: customer.id,
          branchId: BigInt(dto.branchId),
          userId: BigInt(dto.userId),
          couponId: couponId ? BigInt(couponId) : null,
          subtotal,
          discount,
          tax,
          finalAmount,
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

      // Deduct stock + log movement
      for (const item of dto.items) {
        await tx.inventory.update({
          where: {
            variantId_branchId: {
              variantId: BigInt(item.variantId),
              branchId: BigInt(dto.branchId),
            },
          },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            variantId: BigInt(item.variantId),
            branchId: BigInt(dto.branchId),
            type: 'SALE',
            quantity: -item.quantity,
            referenceId: created.id,
          },
        });
      }

      // Coupon usage
      if (dto.couponCode && couponId) {
        await tx.couponUsage.create({
          data: {
            couponId: BigInt(couponId),
            invoiceId: created.id,
            customerId: customer.id,
          },
        });
        await tx.coupon.update({
          where: { id: BigInt(couponId) },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Link voucher codes to this invoice (redeem)
      for (const code of voucherCodes) {
        await tx.voucher.update({
          where: { voucherCode: code },
          data: { invoiceId: created.id },
        });
      }

      // Payment record
      await tx.payment.create({
        data: {
          invoiceId: created.id,
          paymentMethod: dto.paymentMethod,
          amount: finalAmount,
        },
      });

      return created;
    });

    // Return full invoice with relations
    return this.prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        customer: true,
        branch: true,
        user: { select: { id: true, name: true, email: true } },
        coupon: true,
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
        vouchers: { include: { campaign: true } },
        payments: true,
      },
    });
  }

  // ─── Shop History ─────────────────────────────────────────────────────────────

  async myInvoices(
    branchId: number,
    status?: string,
    search?: string,
    from?: string,
    to?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { branchId: BigInt(branchId) };

    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
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
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          user: { select: { id: true, name: true } },
          coupon: true,
          items: {
            include: {
              variant: { include: { product: true } },
            },
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: invoices,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async myReturns(branchId: number) {
    return this.prisma.return.findMany({
      where: { branchId: BigInt(branchId), returnType: 'INVOICE' },
      include: {
        customer: true,
        items: {
          include: { variant: { include: { product: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Stock View ──────────────────────────────────────────────────────────────

  async shopStock(branchId: number, search?: string) {
    const where: any = { branchId: BigInt(branchId) };
    if (search) {
      where.variant = {
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    return this.prisma.inventory.findMany({
      where,
      include: {
        variant: {
          include: {
            product: { include: { category: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────

  async analytics(branchId: number, from?: string, to?: string) {
    const dateFilter: any = {};
    if (from || to) {
      if (from) dateFilter.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }
    }

    const invoiceWhere: any = {
      branchId: BigInt(branchId),
      status: 'COMPLETED',
      ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
    };

    const returnWhere: any = {
      branchId: BigInt(branchId),
      returnType: 'INVOICE',
      ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
    };

    const [invoices, returns, topVariants] = await Promise.all([
      this.prisma.invoice.findMany({
        where: invoiceWhere,
        include: { items: true, payments: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.return.findMany({
        where: returnWhere,
        include: { items: true },
      }),
      this.prisma.invoiceItem.groupBy({
        by: ['variantId'],
        where: { invoice: invoiceWhere },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    // Populate variant details for top sellers
    const topSellerDetails = await Promise.all(
      topVariants.map(async (tv) => {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: tv.variantId },
          include: { product: true },
        });
        return {
          variantId: Number(tv.variantId),
          sku: variant?.sku,
          size: variant?.size,
          color: variant?.color,
          productName: variant?.product?.name,
          totalQtySold: tv._sum.quantity ?? 0,
          totalRevenue: Number(tv._sum.subtotal ?? 0),
        };
      }),
    );

    // Day-wise sales aggregation
    const dayMap: Record<string, { date: string; sales: number; orders: number }> = {};
    for (const inv of invoices) {
      const day = inv.createdAt.toISOString().slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { date: day, sales: 0, orders: 0 };
      dayMap[day].sales += Number(inv.finalAmount);
      dayMap[day].orders += 1;
    }

    const totalRevenue = invoices.reduce((s, i) => s + Number(i.finalAmount), 0);
    const totalDiscount = invoices.reduce((s, i) => s + Number(i.discount), 0);
    const totalRefunds = returns.reduce((s, r) => s + Number(r.totalRefund), 0);
    const totalItemsSold = invoices.reduce(
      (s, i) => s + i.items.reduce((si, item) => si + item.quantity, 0),
      0,
    );

    return {
      summary: {
        totalInvoices: invoices.length,
        totalRevenue,
        totalDiscount,
        totalRefunds,
        netRevenue: totalRevenue - totalRefunds,
        totalItemsSold,
        totalReturns: returns.length,
      },
      topSellers: topSellerDetails,
      dailySales: Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // ─── Returns ─────────────────────────────────────────────────────────────────

  async createReturn(dto: CreateReturnDto) {
    return this.returnsService.create(dto);
  }
}
