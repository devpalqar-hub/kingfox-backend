import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { BillingPreviewDto } from './dto/billing-preview.dto';
import { BillingCheckoutDto } from './dto/billing-checkout.dto';
import { CreateReturnDto } from '../returns/dto/create-return.dto';

@ApiTags('Billing')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ─── Customer ────────────────────────────────────────────────────────────────

  @Get('customer-lookup')
  @ApiOperation({
    summary: 'Look up a customer by phone number',
    description:
      'Use before billing to pre-fill customer details. Returns the customer if found, or null if not — in which case the biller provides the name at checkout and the customer is created automatically.',
  })
  @ApiQuery({ name: 'phone', example: '9901234567', description: 'Mobile number to search' })
  customerLookup(@Query('phone') phone: string) {
    return this.billingService.lookupCustomer(phone);
  }

  // ─── Product Search / Scan ───────────────────────────────────────────────────

  @Get('product-search')
  @ApiOperation({
    summary: 'Search products by name, SKU, or barcode',
    description:
      'Returns matching variants with their current stock at the given branch and selling price.',
  })
  @ApiQuery({ name: 'q', example: 'Cotton Tee', description: 'Search string — name, partial SKU, or partial barcode' })
  @ApiQuery({ name: 'branchId', example: 1, description: 'Shop branch ID' })
  productSearch(
    @Query('q') q: string,
    @Query('branchId') branchId: string,
  ) {
    return this.billingService.searchProduct(q, +branchId);
  }

  @Get('product-scan')
  @ApiOperation({
    summary: 'Scan a barcode to fetch product details',
    description:
      'Look up a single variant by exact barcode. Returns variant info, price, and stock at the given branch.',
  })
  @ApiQuery({ name: 'barcode', example: '8901234501001', description: 'Exact barcode / EAN of the product' })
  @ApiQuery({ name: 'branchId', example: 1, description: 'Shop branch ID' })
  productScan(
    @Query('barcode') barcode: string,
    @Query('branchId') branchId: string,
  ) {
    return this.billingService.scanBarcode(barcode, +branchId);
  }

  // ─── Preview & Checkout ──────────────────────────────────────────────────────

  @Post('preview')
  @ApiOperation({
    summary: 'Dynamic bill preview — call on every item add/remove',
    description:
      'Send the current list of items (variantId + quantity), optional coupon code, and optional GST %. ' +
      'Returns a full price breakdown: subtotal, discount, gstAmount, gstPercent, and finalAmount. ' +
      'Nothing is saved — call /checkout to finalise.',
  })
  previewBill(@Body() dto: BillingPreviewDto) {
    return this.billingService.previewBill(dto);
  }

  @Post('checkout')
  @ApiOperation({
    summary: 'Finalise bill — create invoice, deduct stock, record payment',
    description:
      'Atomically creates the invoice, deducts stock, records coupon usage, redeems vouchers, and logs the payment. ' +
      'Customer is identified by phone — created automatically if new. ' +
      'Returns the complete invoice with all relations.',
  })
  checkout(@Body() dto: BillingCheckoutDto) {
    return this.billingService.checkout(dto);
  }

  // ─── History ────────────────────────────────────────────────────────────────

  @Get('my-invoices')
  @ApiOperation({
    summary: "Paginated invoice history for the biller's shop",
    description: 'Filter by status, date range, or search by invoice number / customer name / phone.',
  })
  @ApiQuery({ name: 'branchId', example: 1, description: 'Shop branch ID' })
  @ApiQuery({ name: 'status', required: false, example: 'COMPLETED', description: 'DRAFT | COMPLETED | CANCELLED | RETURNED' })
  @ApiQuery({ name: 'search', required: false, example: 'Arjun', description: 'Invoice number, customer name or phone' })
  @ApiQuery({ name: 'from', required: false, example: '2025-03-01', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, example: '2025-03-31', description: 'End date (YYYY-MM-DD)' })
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
    return this.billingService.myInvoices(
      +branchId,
      status,
      search,
      from,
      to,
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }

  @Get('my-returns')
  @ApiOperation({
    summary: "Shop return history for the biller's shop",
    description: 'Returns all INVOICE-type returns processed at the given branch, newest first.',
  })
  @ApiQuery({ name: 'branchId', example: 1, description: 'Shop branch ID' })
  myReturns(@Query('branchId') branchId: string) {
    return this.billingService.myReturns(+branchId);
  }

  @Post('return')
  @ApiOperation({
    summary: 'Process a return from an existing invoice',
    description:
      'Creates a return record, restores stock, and marks the invoice as RETURNED. Set `returnType` to `INVOICE` and provide `invoiceId`.',
  })
  createReturn(@Body() dto: CreateReturnDto) {
    return this.billingService.createReturn(dto);
  }

  // ─── Stock View ──────────────────────────────────────────────────────────────

  @Get('stock')
  @ApiOperation({
    summary: "View current stock levels at the biller's shop",
    description: 'Returns all inventory entries for the branch, including product and variant details.',
  })
  @ApiQuery({ name: 'branchId', example: 1, description: 'Shop branch ID' })
  @ApiQuery({ name: 'search', required: false, example: 'Tee', description: 'Filter by product name or SKU' })
  shopStock(
    @Query('branchId') branchId: string,
    @Query('search') search?: string,
  ) {
    return this.billingService.shopStock(+branchId, search);
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────

  @Get('analytics')
  @ApiOperation({
    summary: "Sales analytics dashboard for the biller's shop",
    description:
      'Returns total revenue, discounts, refunds, net revenue, items sold, top 5 best-selling products, and day-wise sales chart data.',
  })
  @ApiQuery({ name: 'branchId', example: 1, description: 'Shop branch ID' })
  @ApiQuery({ name: 'from', required: false, example: '2025-01-01', description: 'Start of reporting period (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, example: '2025-12-31', description: 'End of reporting period (YYYY-MM-DD)' })
  analytics(
    @Query('branchId') branchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.billingService.analytics(+branchId, from, to);
  }
}
