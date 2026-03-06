import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { BillingPreviewDto } from './dto/billing-preview.dto';
import { BillingCheckoutDto } from './dto/billing-checkout.dto';
import { ScanItemDto, UpdateItemQtyDto, CartCheckoutDto } from './dto/billing-cart.dto';
import { CreateReturnDto } from '../returns/dto/create-return.dto';

@ApiTags('Billing')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CART — Per-biller draft invoice (no session start/end needed)
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('cart')
  @ApiOperation({
    summary: "Get biller's current cart",
    description:
      'Returns the running summary of the biller\'s active DRAFT invoice. ' +
      'Returns empty cart object if nothing has been scanned yet. No parameters needed — biller is identified via JWT.',
  })
  getCart(@Request() req) {
    return this.billingService.getCart(+req.user.sub);
  }

  @Post('cart/scan')
  @ApiOperation({
    summary: 'Scan a barcode into the cart',
    description:
      'Looks up the product by barcode and adds it to the biller\'s cart. ' +
      'If the product is already in the cart, quantity is incremented by 1. ' +
      'The cart (DRAFT invoice) is auto-created on the first scan. ' +
      'Returns the full updated cart summary after every scan.',
  })
  scanItem(@Request() req, @Body() dto: ScanItemDto) {
    return this.billingService.scanItem(+req.user.sub, dto);
  }

  @Patch('cart/item/:variantId')
  @ApiOperation({
    summary: 'Update quantity of a cart item',
    description: 'Set a new quantity for the given variant. Send quantity: 0 to remove the item entirely. Returns updated cart summary.',
  })
  @ApiParam({ name: 'variantId', example: 1, description: 'Variant ID to update' })
  updateItem(
    @Request() req,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateItemQtyDto,
  ) {
    return this.billingService.updateCartItem(+req.user.sub, variantId, dto);
  }

  @Delete('cart')
  @ApiOperation({
    summary: 'Clear the cart — discard draft',
    description:
      'Deletes the biller\'s active DRAFT invoice and all its items. ' +
      'Use when the biller wants to start fresh or cancel the current billing.',
  })
  clearCart(@Request() req) {
    return this.billingService.clearCart(+req.user.sub);
  }

  @Post('cart/checkout')
  @ApiOperation({
    summary: 'Finalise cart → completed invoice',
    description:
      'Atomically converts the DRAFT invoice to COMPLETED: deducts stock, records coupon usage, redeems vouchers, creates payment. ' +
      'Customer identified by phone (created if new). All discount and voucher fields are optional.',
  })
  checkoutCart(@Request() req, @Body() dto: CartCheckoutDto) {
    return this.billingService.checkoutCart(+req.user.sub, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER LOOKUP
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('customer-lookup')
  @ApiOperation({
    summary: 'Look up a customer by phone number',
    description:
      'Returns customer details if found, null otherwise. Use to pre-fill customer name before checkout.',
  })
  @ApiQuery({ name: 'phone', example: '9901234567', description: 'Mobile number to search' })
  customerLookup(@Query('phone') phone: string) {
    return this.billingService.lookupCustomer(phone);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT SEARCH / SCAN (lookup-only, no cart mutation)
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('product-search')
  @ApiOperation({
    summary: 'Search products by name, SKU, or barcode',
    description: 'Returns matching variants with stock and price. Use for manual search; use /cart/scan to add to cart.',
  })
  @ApiQuery({ name: 'q', example: 'Cotton Tee', description: 'Name, partial SKU, or partial barcode' })
  @ApiQuery({ name: 'branchId', example: 1, description: 'Shop branch ID' })
  productSearch(@Query('q') q: string, @Query('branchId') branchId: string) {
    return this.billingService.searchProduct(q, +branchId);
  }

  @Get('product-scan')
  @ApiOperation({
    summary: 'Lookup a barcode without adding to cart',
    description: 'Returns product info for the scanned barcode. Does not modify the cart.',
  })
  @ApiQuery({ name: 'barcode', example: '8901234501001', description: 'Exact barcode / EAN' })
  @ApiQuery({ name: 'branchId', example: 1, description: 'Shop branch ID' })
  productScan(@Query('barcode') barcode: string, @Query('branchId') branchId: string) {
    return this.billingService.scanBarcode(barcode, +branchId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATELESS PREVIEW & DIRECT CHECKOUT (advanced / non-cart flow)
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('preview')
  @ApiOperation({
    summary: 'Stateless bill preview',
    description: 'Calculate subtotal, GST, and total for a given list of items + optional coupon. Nothing is saved.',
  })
  previewBill(@Body() dto: BillingPreviewDto) {
    return this.billingService.previewBill(dto);
  }

  @Post('checkout')
  @ApiOperation({
    summary: 'Direct checkout (stateless — bypasses cart)',
    description: 'Create an invoice directly without using the cart flow. Requires full item list with prices.',
  })
  checkout(@Body() dto: BillingCheckoutDto) {
    return this.billingService.checkout(dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORY & RETURNS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('my-invoices')
  @ApiOperation({ summary: "Paginated invoice history for the biller's shop" })
  @ApiQuery({ name: 'branchId', example: 1 })
  @ApiQuery({ name: 'status', required: false, example: 'COMPLETED' })
  @ApiQuery({ name: 'search', required: false, example: 'Arjun' })
  @ApiQuery({ name: 'from', required: false, example: '2025-03-01' })
  @ApiQuery({ name: 'to', required: false, example: '2025-03-31' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  myInvoices(
    @Query('branchId') branchId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billingService.myInvoices(+branchId, status, search, from, to, page ? +page : 1, limit ? +limit : 20);
  }

  @Get('my-returns')
  @ApiOperation({ summary: "Shop return history for the biller's shop" })
  @ApiQuery({ name: 'branchId', example: 1 })
  myReturns(@Query('branchId') branchId: string) {
    return this.billingService.myReturns(+branchId);
  }

  @Post('return')
  @ApiOperation({ summary: 'Process a return from an existing invoice' })
  createReturn(@Body() dto: CreateReturnDto) {
    return this.billingService.createReturn(dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STOCK & ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('stock')
  @ApiOperation({ summary: "View stock at the biller's shop" })
  @ApiQuery({ name: 'branchId', example: 1 })
  @ApiQuery({ name: 'search', required: false, example: 'Tee' })
  shopStock(@Query('branchId') branchId: string, @Query('search') search?: string) {
    return this.billingService.shopStock(+branchId, search);
  }

  @Get('analytics')
  @ApiOperation({ summary: "Sales analytics for the biller's shop" })
  @ApiQuery({ name: 'branchId', example: 1 })
  @ApiQuery({ name: 'from', required: false, example: '2025-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2025-12-31' })
  analytics(
    @Query('branchId') branchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.billingService.analytics(+branchId, from, to);
  }
}
