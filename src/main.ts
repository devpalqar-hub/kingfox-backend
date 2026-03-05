import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// ─── BigInt JSON serialization fix ──────────────────────────────────────────
// Prisma returns BigInt for all @id fields. Express's JSON.stringify
// doesn't know how to handle BigInt natively, causing "Do not know how to
// serialize a BigInt" errors. This one-liner converts every BigInt to a
// Number (safe for IDs up to 2^53-1) before serialization.
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};
// ────────────────────────────────────────────────────────────────────────────

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
      `## Kingfox Clothing ERP — REST API Reference

A comprehensive backend for managing a multi-branch clothing retail business.

### 🔐 Authentication
All protected endpoints require a **Bearer JWT** token.
1. Call \`POST /v1/auth/login\` with your credentials
2. Copy the \`access_token\` from the response
3. Click **Authorize** (🔓) at the top and paste the token

### 📦 Seeded Test Credentials
| Role     | Email                    | Password       |
|----------|--------------------------|----------------|
| Admin    | admin@kingfox.com        | Admin@1234     |
| Manager  | manager1@kingfox.com     | Manager@123    |
| Staff    | staff1@kingfox.com       | Staff@123      |
| Cashier  | cashier1@kingfox.com     | Cashier@123    |

### 🏪 Seeded Branches
| ID | Name                 | Type       |
|----|----------------------|------------|
| 1  | Main Shop            | SHOP       |
| 2  | Central Warehouse    | WAREHOUSE  |
| 3  | North Branch Shop    | SHOP       |
| 4  | South Branch Shop    | SHOP       |
`,
    )
    .setVersion('1.0')
    .setContact('Kingfox ERP Team', '', 'admin@kingfox.com')
    .addServer('http://localhost:3000', 'Local Development')
    .addServer('https://api.kingfox.palqar.cloud', 'Staging')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token (without "Bearer " prefix)',
        in: 'header',
      },
      'access-token',
    )
    // ── Tags in logical flow order ──────────────────────────────────────────
    .addTag('Auth', '🔐 Login, register, OTP verification')
    .addTag('Billing', '🧾 Cashier/biller workflow — scan, bill, checkout, analytics')
    .addTag('Users', '👤 User management (admin only)')
    .addTag('Roles', '🎭 Role management (admin only)') 
    .addTag('Branches', '🏪 Branch management — SHOP or WAREHOUSE')
    .addTag('Categories', '🏷️ Product category management')
    .addTag('Brands', '™️ Brand management')
    .addTag('Products', '👕 Products and their size/color variants')
    .addTag('Inventory', '📦 Stock levels per branch')
    .addTag('Suppliers', '🚚 Supplier / vendor management')
    .addTag('Purchase Orders', '🧾 Purchase order lifecycle (PO → receive → stock)')
    .addTag('Customers', '🙋 Customer profile management')
    .addTag('Coupons', '🎁 Discount coupons and usage tracking')
    .addTag('Invoices', '🧾 POS / shop billing and payments')
    .addTag('Returns', '↩️ Returns and refunds (shop & online)')
    .addTag('Lucky Draw', '🎰 Lucky draw campaigns and voucher issuance')
    .addTag('Online Orders', '🛒 E-commerce / warehouse order fulfilment')
    .addTag('Delivery Agents', '🚴 Courier partner management')
    .addTag('Shipments', '📫 Shipment creation and tracking')
    .addTag('Stock Transfers', '🔄 Inter-branch stock transfer requests')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Kingfox ERP API Docs',
    //customfavIcon: 'https://nestjs.com/img/logo_text.svg',
    swaggerOptions: {
      persistAuthorization: true,
      // Show example request bodies by default
      requestInterceptor: (req: any) => req,
      // Collapse all tags by default — use 'list' to expand all
      docExpansion: 'list',
      // Sort tags alphabetically
      tagsSorter: 'alpha',
      // Sort operations inside each tag
      operationsSorter: 'alpha',
      // Show request duration
      displayRequestDuration: true,
      // Try-it-out enabled by default
      tryItOutEnabled: true,
      // Show schemas section
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 3,
      // Show enum values in description
      showExtensions: true,
      showCommonExtensions: true,
      filter: true,
    },
  });
  // ─────────────────────────────────────────────────────────────────────────────

  await app.listen(process.env.PORT || 3000);
  console.log(`🚀 Application running on: ${await app.getUrl()}/v1`);
  console.log(`📚 Swagger docs:          ${await app.getUrl()}/docs`);
}
bootstrap();
