import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { CreateExchangeDto } from './dto/create-exchange.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Returns')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @ApiOperation({
    summary: 'Process a return (full or partial)',
    description:
      'Creates a return and restores stock. ' +
      'Use `returnType: INVOICE` for a FULL return (invoice → RETURNED) or ' +
      '`returnType: PARTIAL_RETURN` when returning only some items (invoice → PARTIALLY_RETURNED). ' +
      'Refund amounts are auto-calculated from the original invoice prices — no need to send them.',
  })
  create(@Body() dto: CreateReturnDto) {
    return this.returnsService.create(dto);
  }

  @Post('exchange')
  @ApiOperation({
    summary: 'Process an exchange — return items + issue new items in one step',
    description:
      'Returns specified items from an original invoice and creates a new exchange invoice for the given items. ' +
      'The return credit (from original prices) is applied as a deduction on the new bill. ' +
      'Customer pays only the difference (or receives a refund if credit > new items cost). ' +
      'Exchange invoice shows: subtotal, returnCredit, discount (coupon), gstAmount, finalAmount.',
  })
  createExchange(@Body() dto: CreateExchangeDto) {
    return this.returnsService.createExchange(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all returns with optional filters' })
  @ApiQuery({ name: 'branchId', required: false, example: 1 })
  @ApiQuery({ name: 'type', required: false, example: 'INVOICE', description: 'INVOICE | PARTIAL_RETURN | ONLINE_ORDER' })
  findAll(
    @Query('branchId') branchId?: string,
    @Query('type') type?: string,
  ) {
    return this.returnsService.findAll(branchId ? +branchId : undefined, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single return by ID (includes exchange invoice if applicable)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.returnsService.findOne(id);
  }
}
