// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ResponseModule } from './response/response.module';

// ERP Modules
import { BranchesModule } from './branches/branches.module';
import { RolesModule } from './roles/roles.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { CustomersModule } from './customers/customers.module';
import { CouponsModule } from './coupons/coupons.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ReturnsModule } from './returns/returns.module';
import { LuckyDrawModule } from './lucky-draw/lucky-draw.module';
import { OnlineOrdersModule } from './online-orders/online-orders.module';
import { DeliveryAgentsModule } from './delivery-agents/delivery-agents.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { StockTransfersModule } from './stock-transfers/stock-transfers.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env${process.env.NODE_ENV === 'test' ? '.test' : ''}`,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ResponseModule,
    // ERP Feature Modules
    BranchesModule,
    RolesModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    SuppliersModule,
    PurchaseOrdersModule,
    CustomersModule,
    CouponsModule,
    InvoicesModule,
    ReturnsModule,
    LuckyDrawModule,
    OnlineOrdersModule,
    DeliveryAgentsModule,
    ShipmentsModule,
    StockTransfersModule,
    BillingModule,
  ],
})
export class AppModule {}
