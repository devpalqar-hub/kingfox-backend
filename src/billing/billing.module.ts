import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CouponsModule } from '../coupons/coupons.module';
import { CustomersModule } from '../customers/customers.module';
import { ReturnsModule } from '../returns/returns.module';

@Module({
  imports: [PrismaModule, CouponsModule, CustomersModule, ReturnsModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
