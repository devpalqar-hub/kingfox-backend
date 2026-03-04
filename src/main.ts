import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('v1');

  // Body parsing
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true }));

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  // ─── Swagger ─────────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Kingfox ERP API')
    .setDescription(
      'Clothing ERP backend — Branches, Products, Inventory, Invoices, Online Orders, Stock Transfers & more',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Branches', 'Branch management (SHOP / WAREHOUSE)')
    .addTag('Roles', 'Role management')
    .addTag('Categories', 'Product categories')
    .addTag('Brands', 'Product brands')
    .addTag('Products', 'Products and variants')
    .addTag('Inventory', 'Stock levels and movements')
    .addTag('Suppliers', 'Supplier management')
    .addTag('Purchase Orders', 'Purchase order lifecycle')
    .addTag('Customers', 'Customer management')
    .addTag('Coupons', 'Discount coupons')
    .addTag('Invoices', 'Shop billing / POS invoices')
    .addTag('Returns', 'Returns and refunds')
    .addTag('Lucky Draw', 'Lucky draw campaigns and vouchers')
    .addTag('Online Orders', 'Warehouse online order flow')
    .addTag('Delivery Agents', 'Courier / delivery partners')
    .addTag('Shipments', 'Shipment tracking')
    .addTag('Stock Transfers', 'Inter-branch stock transfers')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  // ─────────────────────────────────────────────────────────────────────────────

  await app.listen(process.env.PORT || 3000);
  console.log(`🚀 Application running on: ${await app.getUrl()}/v1`);
  console.log(`📚 Swagger docs:          ${await app.getUrl()}/docs`);
}
bootstrap();
