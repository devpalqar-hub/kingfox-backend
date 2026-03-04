import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        brandId: dto.brandId,
        categoryId: dto.categoryId,
      },
      include: { brand: true, category: true, variants: true },
    });
  }

  findAll(search?: string, categoryId?: number, brandId?: number) {
    return this.prisma.product.findMany({
      where: {
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(brandId ? { brandId } : {}),
      },
      include: { brand: true, category: true, variants: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        variants: {
          include: {
            inventory: { include: { branch: true } },
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: number, dto: Partial<CreateProductDto>) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        brandId: dto.brandId,
        categoryId: dto.categoryId,
      },
      include: { brand: true, category: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }

  // Variants
  async addVariant(productId: number, dto: CreateVariantDto) {
    await this.findOne(productId);
    const skuExists = await this.prisma.productVariant.findUnique({ where: { sku: dto.sku } });
    if (skuExists) throw new ConflictException('SKU already exists');
    if (dto.barcode) {
      const barcodeExists = await this.prisma.productVariant.findUnique({ where: { barcode: dto.barcode } });
      if (barcodeExists) throw new ConflictException('Barcode already exists');
    }
    return this.prisma.productVariant.create({
      data: {
        productId,
        size: dto.size,
        color: dto.color,
        sku: dto.sku,
        barcode: dto.barcode,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
      },
    });
  }

  getVariants(productId: number) {
    return this.prisma.productVariant.findMany({
      where: { productId },
      include: { inventory: { include: { branch: true } } },
    });
  }

  async updateVariant(variantId: number, dto: Partial<CreateVariantDto>) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variant not found');
    return this.prisma.productVariant.update({ where: { id: variantId }, data: dto });
  }

  async removeVariant(variantId: number) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variant not found');
    return this.prisma.productVariant.delete({ where: { id: variantId } });
  }
}
