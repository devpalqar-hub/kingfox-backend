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
  ApiParam,
  ApiQuery,
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
  // CART — Per-biller draft invoice
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('cart')
  @ApiOperation({
    summary: "Get biller's current cart",
    description:
      'Returns the live summary of the biller\'s active DRAFT invoice. Returns an empty cart if nothing has been scanned yet. ' +
      'Branch is derived from the logged-in biller — no parameters needed.',
  })
  getCart(@Request() req) {
    return this.billingService.getCart(+req.user.sub);
  }

  @Post('cart/scan')
  @ApiOperation({
    summary: 'Scan a barcode into the cart',
    description:
      'Adds the scanned product to the cart. Scanning the same barcode again increments quantity by 1. ' +
      'The DRAFT invoice is auto-created on the very first scan.',
  })
  scanItem(@Request() req, @Body() dto: ScanItemDto) {
    return this.billingService.scanItem(+req.user.sub, dto);
  }

  @Patch('cart/item/:variantId')
  @ApiOperation({
    summary: 'Update quantity of a cart item',
    description: 'Set a new quantity for the given variant. Send `quantity: 0` to remove the item entirely.',
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
    description: 'Deletes the biller\'s DRAFT invoice and all its items. Use to start fresh or cancel billing.',
  })
  clearCart(@Request() req) {
    return this.billingService.clearCart(+req.user.sub);
  }

  @Post('cart/checkout')
  @ApiOperation({
    summary: 'Finalise cart → completed invoice',
    description:
      'Atomically converts the DRAFT invoice to COMPLETED: deducts stock, applies coupon, redeems vouchers, records payment. ' +
      'Customer is resolved by phone (created if new). All discount/voucher fields are optional.',
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
    description: 'Returns customer details to pre-fill the checkout form. Returns null if not found (new customer).',
  })
  @ApiQuery({ name: 'phone', example: '9901234567', description: 'Mobile number' })
  customerLookup(@Query('phone') phone: string) {
    return this.billingService.lookupCustomer(phone);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT SEARCH / SCAN (lookup-only, no cart mutation)
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('product-search')
  @ApiOperation({
    summary: 'Search products by name, SKU, or barcode',
    description:
      'Returns matching variants with stock at the biller\'s branch. ' +
      'Branch is derived from JWT — no branchId needed.',
  })
  @ApiQuery({ name: 'q', example: 'Cotton Tee', description: 'Name, partial SKU, or partial barcode' })
  productSearch(@Request() req, @Query('q') q: string) {
    return this.billingService.searchProduct(q, +req.user.sub);
  }

  @Get('product-scan')
  @ApiOperation({
    summary: 'Look up a barcode without adding to cart',
    description: 'Returns product info for the barcode. Does not modify the cart.',
  })
  @ApiQuery({ name: 'barcode', example: '8901234501001', description: 'Exact barcode / EAN' })
  productScan(@Request() req, @Query('barcode') barcode: string) {
    return this.billingService.scanBarcode(barcode, +req.user.sub);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATELESS PREVIEW & DIRECT CHECKOUT
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('preview')
  @ApiOperation({
    summary: 'Stateless bill preview',
    description:
      'Calculate subtotal, GST, and total for the given items + optional coupon. Nothing is saved. ' +
      'Branch is derived from JWT.',
  })
  previewBill(@Request() req, @Body() dto: BillingPreviewDto) {
    return this.billingService.previewBill(+req.user.sub, dto);
  }

  @Post('checkout')
  @ApiOperation({
    summary: 'Direct checkout (stateless — bypasses cart)',
    description:
      'Create an invoice directly without using the cart flow. Requires full item list with prices. ' +
      'Branch and biller are derived from JWT — no branchId or userId needed in the body.',
  })
  checkout(@Request() req, @Body() dto: BillingCheckoutDto) {
    return this.billingService.checkout(+req.user.sub, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORY & RETURNS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('my-invoices')
  @ApiOperation({
    summary: "Paginated invoice history for the biller's branch",
    description: 'Branch is derived from JWT. Filter by status, date range, or search string.',
  })
  @ApiQuery({ name: 'status', required: false, example: 'COMPLETED', description: 'DRAFT | COMPLETED | CANCELLED | RETURNED | PARTIALLY_RETURNED' })
  @ApiQuery({ name: 'search', required: false, example: 'Arjun', description: 'Invoice number, customer name or phone' })
  @ApiQuery({ name: 'from', required: false, example: '2025-03-01', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, example: '2025-03-31', description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  myInvoices(
    @Request() req,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billingService.myInvoices(+req.user.sub, status, search, from, to, page ? +page : 1, limit ? +limit : 20);
  }

  @Get('my-returns')
  @ApiOperation({
    summary: "Return history for the biller's branch",
    description: 'Branch is derived from JWT.',
  })
  myReturns(@Request() req) {
    return this.billingService.myReturns(+req.user.sub);
  }

  @Post('return')
  @ApiOperation({
    summary: 'Process a return from an existing invoice',
    description: 'Delegates to POST /returns. Use returnType: INVOICE for full return, PARTIAL_RETURN for partial.',
  })
  createReturn(@Body() dto: CreateReturnDto) {
    return this.billingService.createReturn(dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STOCK & ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('stock')
  @ApiOperation({
    summary: "Stock levels at the biller's branch",
    description: 'Branch derived from JWT. Optionally filter by product name or SKU.',
  })
  @ApiQuery({ name: 'search', required: false, example: 'Tee', description: 'Filter by name or SKU' })
  shopStock(@Request() req, @Query('search') search?: string) {
    return this.billingService.shopStock(+req.user.sub, search);
  }

  @Get('analytics')
  @ApiOperation({
    summary: "Sales analytics for the biller's branch",
    description: 'Branch derived from JWT. Optionally filter by date range.',
  })
  @ApiQuery({ name: 'from', required: false, example: '2025-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2025-12-31' })
  analytics(
    @Request() req,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.billingService.analytics(+req.user.sub, from, to);
  }
}
