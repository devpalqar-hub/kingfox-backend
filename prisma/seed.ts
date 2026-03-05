import { PrismaClient, BranchType, InvoiceStatus, OrderStatus, DiscountType, CampaignStatus, TransferStatus, ReturnType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ─────────────────────────────────────────────
  // 1. ROLES
  // ─────────────────────────────────────────────
  console.log('Seeding roles...');
  const [adminRole, managerRole, staffRole, cashierRole] = await Promise.all([
    prisma.role.upsert({ where: { name: 'admin' },   update: {}, create: { name: 'admin' } }),
    prisma.role.upsert({ where: { name: 'manager' }, update: {}, create: { name: 'manager' } }),
    prisma.role.upsert({ where: { name: 'staff' },   update: {}, create: { name: 'staff' } }),
    prisma.role.upsert({ where: { name: 'cashier' }, update: {}, create: { name: 'cashier' } }),
  ]);

  // ─────────────────────────────────────────────
  // 2. BRANCHES
  // ─────────────────────────────────────────────
  console.log('Seeding branches...');
  const mainShop = await prisma.branch.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: { name: 'Main Shop',            phone: '9876543210', address: '12, MG Road, Chennai',       type: BranchType.SHOP },
  });
  const warehouse = await prisma.branch.upsert({
    where: { id: BigInt(2) },
    update: {},
    create: { name: 'Central Warehouse',     phone: '9876543211', address: '5, Industrial Area, Hosur', type: BranchType.WAREHOUSE },
  });
  const northShop = await prisma.branch.upsert({
    where: { id: BigInt(3) },
    update: {},
    create: { name: 'North Branch Shop',     phone: '9876543212', address: '34, Anna Nagar, Chennai',   type: BranchType.SHOP },
  });
  const southShop = await prisma.branch.upsert({
    where: { id: BigInt(4) },
    update: {},
    create: { name: 'South Branch Shop',     phone: '9876543213', address: '88, T. Nagar, Chennai',     type: BranchType.SHOP },
  });

  // ─────────────────────────────────────────────
  // 3. USERS
  // ─────────────────────────────────────────────
  console.log('Seeding users...');
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kingfox.com' },
    update: {},
    create: { email: 'admin@kingfox.com',   name: 'Admin',          password: await hash('Admin@1234'),   roleId: adminRole.id,   branchId: mainShop.id },
  });
  const mgr1 = await prisma.user.upsert({
    where: { email: 'manager1@kingfox.com' },
    update: {},
    create: { email: 'manager1@kingfox.com', name: 'Ravi Kumar',     password: await hash('Manager@123'),  roleId: managerRole.id, branchId: mainShop.id },
  });
  const mgr2 = await prisma.user.upsert({
    where: { email: 'manager2@kingfox.com' },
    update: {},
    create: { email: 'manager2@kingfox.com', name: 'Priya Sharma',   password: await hash('Manager@123'),  roleId: managerRole.id, branchId: northShop.id },
  });
  const staff1 = await prisma.user.upsert({
    where: { email: 'staff1@kingfox.com' },
    update: {},
    create: { email: 'staff1@kingfox.com',  name: 'Arun Raj',        password: await hash('Staff@123'),    roleId: staffRole.id,   branchId: warehouse.id },
  });
  const staff2 = await prisma.user.upsert({
    where: { email: 'staff2@kingfox.com' },
    update: {},
    create: { email: 'staff2@kingfox.com',  name: 'Divya Nair',      password: await hash('Staff@123'),    roleId: staffRole.id,   branchId: southShop.id },
  });
  const cashier1 = await prisma.user.upsert({
    where: { email: 'cashier1@kingfox.com' },
    update: {},
    create: { email: 'cashier1@kingfox.com', name: 'Suresh Babu',    password: await hash('Cashier@123'),  roleId: cashierRole.id, branchId: mainShop.id },
  });

  // ─────────────────────────────────────────────
  // 4. BRANDS & CATEGORIES
  // ─────────────────────────────────────────────
  console.log('Seeding brands & categories...');
  const brandNames = ['Kingfox', 'FoxStyle', 'UrbanWear', 'ThreadCo', 'EcoFibre'];
  const brands = await Promise.all(
    brandNames.map(name => prisma.brand.upsert({ where: { id: BigInt(brandNames.indexOf(name) + 1) }, update: {}, create: { name } }))
  );

  const categoryNames = ['T-Shirts', 'Shirts', 'Trousers', 'Jeans', 'Jackets', 'Ethnic Wear', 'Activewear'];
  const categories = await Promise.all(
    categoryNames.map(name => prisma.category.upsert({ where: { id: BigInt(categoryNames.indexOf(name) + 1) }, update: {}, create: { name } }))
  );

  // ─────────────────────────────────────────────
  // 5. PRODUCTS + VARIANTS + INVENTORY
  // ─────────────────────────────────────────────
  console.log('Seeding products, variants, and inventory...');

  const productDefs = [
    { name: 'Classic Cotton Tee',    brand: brands[0], category: categories[0], sizes: ['S','M','L','XL'], colors: ['White','Black','Navy'],    cost: 150, sell: 350 },
    { name: 'Slim Fit Formal Shirt', brand: brands[1], category: categories[1], sizes: ['38','40','42'],    colors: ['White','Blue','Grey'],     cost: 400, sell: 950 },
    { name: 'Cargo Trousers',        brand: brands[2], category: categories[2], sizes: ['30','32','34','36'], colors: ['Khaki','Olive','Black'], cost: 500, sell: 1200 },
    { name: 'Skinny Jeans',          brand: brands[3], category: categories[3], sizes: ['30','32','34'],    colors: ['Blue','Black'],            cost: 600, sell: 1500 },
    { name: 'Bomber Jacket',         brand: brands[1], category: categories[4], sizes: ['S','M','L'],       colors: ['Black','Olive'],           cost: 900, sell: 2200 },
    { name: 'Kurta Set',             brand: brands[4], category: categories[5], sizes: ['S','M','L','XL'], colors: ['Cream','Maroon'],           cost: 450, sell: 1100 },
    { name: 'Track Pant',            brand: brands[0], category: categories[6], sizes: ['S','M','L','XL'], colors: ['Black','Grey','Navy'],      cost: 250, sell: 600 },
  ];

  const branches = [mainShop, northShop, southShop, warehouse];
  const createdVariants: { id: bigint }[] = [];
  let skuCounter = 1000;

  for (const def of productDefs) {
    const product = await prisma.product.create({
      data: {
        name: def.name,
        description: `High-quality ${def.name.toLowerCase()} from ${def.brand.name}.`,
        brandId: def.brand.id,
        categoryId: def.category.id,
      },
    });

    for (const size of def.sizes) {
      for (const color of def.colors) {
        skuCounter++;
        const sku = `KF-${skuCounter}`;
        const barcode = `890123${skuCounter}`;
        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            size,
            color,
            sku,
            barcode,
            costPrice: def.cost,
            sellingPrice: def.sell,
          },
        });
        createdVariants.push(variant);

        // create inventory for all branches
        for (const branch of branches) {
          const qty = branch.type === BranchType.WAREHOUSE ? Math.floor(Math.random() * 100) + 50 : Math.floor(Math.random() * 30) + 5;
          await prisma.inventory.upsert({
            where: { variantId_branchId: { variantId: variant.id, branchId: branch.id } },
            update: {},
            create: { variantId: variant.id, branchId: branch.id, stockQuantity: qty },
          });
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  // 6. SUPPLIERS
  // ─────────────────────────────────────────────
  console.log('Seeding suppliers...');
  const suppliers = await Promise.all([
    prisma.supplier.upsert({ where: { id: BigInt(1) }, update: {}, create: { name: 'Coimbatore Textile Mills', phone: '0422-2345678', email: 'supply@ctm.in',       address: 'Coimbatore, TN' } }),
    prisma.supplier.upsert({ where: { id: BigInt(2) }, update: {}, create: { name: 'Tirupur Knit Exports',     phone: '0421-3456789', email: 'orders@tirupurknit.com', address: 'Tirupur, TN' } }),
    prisma.supplier.upsert({ where: { id: BigInt(3) }, update: {}, create: { name: 'Mumbai Fabric House',      phone: '022-23456789', email: 'info@mumbaifabric.com',  address: 'Mumbai, MH' } }),
  ]);

  // ─────────────────────────────────────────────
  // 7. PURCHASE ORDERS
  // ─────────────────────────────────────────────
  console.log('Seeding purchase orders...');
  for (let i = 0; i < 3; i++) {
    const supplier = suppliers[i % suppliers.length];
    const po = await prisma.purchaseOrder.create({
      data: {
        supplierId: supplier.id,
        branchId: warehouse.id,
        totalAmount: 0,
        status: 'RECEIVED',
      },
    });

    let total = 0;
    const pickedVariants = createdVariants.slice(i * 4, i * 4 + 4);
    for (const variant of pickedVariants) {
      const qty = Math.floor(Math.random() * 50) + 20;
      const cost = 200 + i * 50;
      total += qty * cost;
      await prisma.purchaseOrderItem.create({
        data: { purchaseOrderId: po.id, variantId: variant.id, quantity: qty, costPrice: cost },
      });
    }
    await prisma.purchaseOrder.update({ where: { id: po.id }, data: { totalAmount: total } });
  }

  // ─────────────────────────────────────────────
  // 8. CUSTOMERS
  // ─────────────────────────────────────────────
  console.log('Seeding customers...');
  const customerData = [
    { name: 'Arjun Mehta',     phone: '9901234567', email: 'arjun.mehta@gmail.com',    address: 'Adyar, Chennai' },
    { name: 'Sneha Rajan',     phone: '9912345678', email: 'sneha.rajan@gmail.com',    address: 'Velachery, Chennai' },
    { name: 'Karthik Pillai',  phone: '9923456789', email: 'karthik.p@gmail.com',      address: 'Porur, Chennai' },
    { name: 'Meena Sundaram',  phone: '9934567890', email: 'meena.s@gmail.com',        address: 'Tambaram, Chennai' },
    { name: 'Vijay Anand',     phone: '9945678901', email: 'vijay.anand@gmail.com',    address: 'Perambur, Chennai' },
    { name: 'Divya Krishnan',  phone: '9956789012', email: 'divya.k@gmail.com',        address: 'Chromepet, Chennai' },
    { name: 'Rahul Nair',      phone: '9967890123', email: 'rahul.nair@gmail.com',     address: 'Mylapore, Chennai' },
    { name: 'Ananya Das',      phone: '9978901234', email: 'ananya.das@gmail.com',     address: 'Sholinganallur, Chennai' },
  ];

  const customers: { id: bigint }[] = [];
  for (let i = 0; i < customerData.length; i++) {
    const c = await prisma.customer.upsert({
      where: { id: BigInt(i + 1) },
      update: {},
      create: customerData[i],
    });
    customers.push(c);
  }

  // ─────────────────────────────────────────────
  // 9. COUPONS
  // ─────────────────────────────────────────────
  console.log('Seeding coupons...');
  const couponFOXY = await prisma.coupon.upsert({
    where: { code: 'FOXYDEAL' },
    update: {},
    create: {
      code: 'FOXYDEAL', description: 'Get 10% off on all items',
      discountType: DiscountType.PERCENTAGE, discountValue: 10,
      minPurchaseAmount: 500, usageLimit: 200, usedCount: 42,
      startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'),
    },
  });
  const couponFLAT = await prisma.coupon.upsert({
    where: { code: 'FLAT200' },
    update: {},
    create: {
      code: 'FLAT200', description: 'Flat ₹200 off on purchase above ₹1200',
      discountType: DiscountType.FIXED, discountValue: 200,
      minPurchaseAmount: 1200, maxDiscountAmount: 200, usageLimit: 100, usedCount: 18,
      startDate: new Date('2025-03-01'), endDate: new Date('2025-06-30'),
    },
  });

  // ─────────────────────────────────────────────
  // 10. INVOICES
  // ─────────────────────────────────────────────
  console.log('Seeding invoices...');
  const invoiceDefs = [
    { num: 'INV-2025-0001', customer: customers[0], branch: mainShop,  user: cashier1, coupon: couponFOXY,  status: InvoiceStatus.COMPLETED, discount: 105 },
    { num: 'INV-2025-0002', customer: customers[1], branch: mainShop,  user: cashier1, coupon: null,        status: InvoiceStatus.COMPLETED, discount: 0 },
    { num: 'INV-2025-0003', customer: customers[2], branch: northShop, user: mgr2,     coupon: couponFLAT,  status: InvoiceStatus.COMPLETED, discount: 200 },
    { num: 'INV-2025-0004', customer: customers[3], branch: southShop, user: staff2,   coupon: null,        status: InvoiceStatus.DRAFT,     discount: 0 },
    { num: 'INV-2025-0005', customer: customers[4], branch: mainShop,  user: cashier1, coupon: null,        status: InvoiceStatus.CANCELLED, discount: 0 },
  ];

  const createdInvoices: { id: bigint }[] = [];

  for (let i = 0; i < invoiceDefs.length; i++) {
    const def = invoiceDefs[i];
    const varSlice = createdVariants.slice(i * 2, i * 2 + 2);
    let subtotal = 0;
    const items = varSlice.map(v => {
      const qty = 2;
      // @ts-ignore dynamic access for price
      const price = 1000 + i * 100;
      subtotal += qty * price;
      return { variantId: v.id, quantity: qty, price, subtotal: qty * price };
    });
    const finalAmount = subtotal - def.discount;

    const inv = await prisma.invoice.create({
      data: {
        invoiceNumber: def.num,
        customerId: def.customer.id,
        branchId: def.branch.id,
        userId: def.user.id,
        couponId: def.coupon?.id ?? null,
        subtotal,
        discount: def.discount,
        tax: 0,
        finalAmount: finalAmount > 0 ? finalAmount : subtotal,
        status: def.status,
        items: { create: items },
      },
    });
    createdInvoices.push(inv);

    // Payment
    if (def.status === InvoiceStatus.COMPLETED) {
      await prisma.payment.create({
        data: { invoiceId: inv.id, paymentMethod: i % 2 === 0 ? 'CASH' : 'UPI', amount: finalAmount > 0 ? finalAmount : subtotal },
      });
    }

    // Coupon usage
    if (def.coupon) {
      await prisma.couponUsage.create({
        data: { couponId: def.coupon.id, invoiceId: inv.id, customerId: def.customer.id },
      });
    }
  }

  // ─────────────────────────────────────────────
  // 11. LUCKY DRAW CAMPAIGN + VOUCHERS
  // ─────────────────────────────────────────────
  console.log('Seeding lucky draw campaigns & vouchers...');
  const campaign = await prisma.luckyDrawCampaign.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      name: 'Kingfox Summer Lucky Draw 2025',
      description: 'Win exciting prizes this summer!',
      totalVouchersLimit: 500, vouchersIssued: 3,
      startDate: new Date('2025-04-01'), endDate: new Date('2025-07-31'),
      status: CampaignStatus.ACTIVE,
    },
  });

  const voucherIssuers = [adminUser, mgr1, cashier1];
  for (let i = 0; i < 3; i++) {
    const code = `VKFX-${2025}${String(i + 1).padStart(4, '0')}`;
    await prisma.voucher.upsert({
      where: { voucherCode: code },
      update: {},
      create: {
        voucherCode: code,
        campaignId: campaign.id,
        invoiceId: createdInvoices[i]?.id ?? null,
        customerId: customers[i].id,
        branchId: mainShop.id,
        issuedBy: voucherIssuers[i].id,
      },
    });
  }

  // ─────────────────────────────────────────────
  // 12. DELIVERY AGENTS
  // ─────────────────────────────────────────────
  console.log('Seeding delivery agents...');
  const [dtdc, bluedart, delhivery] = await Promise.all([
    prisma.deliveryAgent.upsert({ where: { id: BigInt(1) }, update: {}, create: { name: 'DTDC',       contactPerson: 'Ramesh', phone: '9811223344', email: 'dtdc@courier.com',    trackingUrlTemplate: 'https://www.dtdc.in/tracking.asp?Trck_no={tracking_id}',     isActive: true } }),
    prisma.deliveryAgent.upsert({ where: { id: BigInt(2) }, update: {}, create: { name: 'BlueDart',   contactPerson: 'Suresh', phone: '9822334455', email: 'bluedart@bd.com',     trackingUrlTemplate: 'https://www.bluedart.com/web/guest/trackdartship?TrackNo={tracking_id}', isActive: true } }),
    prisma.deliveryAgent.upsert({ where: { id: BigInt(3) }, update: {}, create: { name: 'Delhivery',  contactPerson: 'Ajay',   phone: '9833445566', email: 'support@delhivery.com', trackingUrlTemplate: 'https://www.delhivery.com/track/package/{tracking_id}',     isActive: true } }),
  ]);

  // ─────────────────────────────────────────────
  // 13. ONLINE ORDERS + ITEMS + PAYMENTS + SHIPMENTS
  // ─────────────────────────────────────────────
  console.log('Seeding online orders...');
  const orderDefs = [
    { num: 'ORD-2025-0001', customer: customers[5], status: OrderStatus.DELIVERED,  confirmedBy: staff1, packedBy: staff1, shippedBy: staff1, agent: dtdc,      tracking: 'DTDC123456' },
    { num: 'ORD-2025-0002', customer: customers[6], status: OrderStatus.SHIPPED,    confirmedBy: staff1, packedBy: staff1, shippedBy: staff1, agent: bluedart,   tracking: 'BD789012' },
    { num: 'ORD-2025-0003', customer: customers[7], status: OrderStatus.PACKED,     confirmedBy: mgr1,   packedBy: mgr1,   shippedBy: null,   agent: delhivery,  tracking: null },
    { num: 'ORD-2025-0004', customer: customers[0], status: OrderStatus.CONFIRMED,  confirmedBy: mgr1,   packedBy: null,   shippedBy: null,   agent: null,       tracking: null },
    { num: 'ORD-2025-0005', customer: customers[1], status: OrderStatus.PENDING,    confirmedBy: null,   packedBy: null,   shippedBy: null,   agent: null,       tracking: null },
  ];

  const createdOnlineOrders: { id: bigint }[] = [];

  for (let i = 0; i < orderDefs.length; i++) {
    const def = orderDefs[i];
    const varSlice = createdVariants.slice(i * 3, i * 3 + 3);
    let subtotal = 0;
    const items = varSlice.map(v => {
      const qty = 1 + i;
      const price = 1200 + i * 200;
      subtotal += qty * price;
      return { variantId: v.id, quantity: qty, price, subtotal: qty * price };
    });

    const order = await prisma.onlineOrder.create({
      data: {
        orderNumber: def.num,
        customerId: def.customer.id,
        warehouseBranchId: warehouse.id,
        status: def.status,
        confirmedBy: def.confirmedBy?.id ?? null,
        packedBy: def.packedBy?.id ?? null,
        shippedBy: def.shippedBy?.id ?? null,
        subtotal,
        discount: 0,
        tax: 0,
        finalAmount: subtotal,
        items: { create: items },
      },
    });
    createdOnlineOrders.push(order);

    // Online payment
    await prisma.onlinePayment.create({
      data: { onlineOrderId: order.id, paymentMethod: i % 2 === 0 ? 'RAZORPAY' : 'COD', amount: subtotal },
    });

    // Shipment for shipped/delivered orders
    if (def.agent && (def.status === OrderStatus.SHIPPED || def.status === OrderStatus.DELIVERED)) {
      await prisma.shipment.create({
        data: {
          onlineOrderId: order.id,
          deliveryAgentId: def.agent.id,
          trackingId: def.tracking ?? undefined,
          trackingUrl: def.tracking ? `https://track.example.com/${def.tracking}` : undefined,
          shippedAt: new Date(),
          deliveredAt: def.status === OrderStatus.DELIVERED ? new Date() : undefined,
          createdBy: staff1.id,
        },
      });
    }
  }

  // ─────────────────────────────────────────────
  // 14. RETURNS
  // ─────────────────────────────────────────────
  console.log('Seeding returns...');
  const returnVariant = createdVariants[0];
  const shopReturn = await prisma.return.create({
    data: {
      returnType: ReturnType.INVOICE,
      invoiceId: createdInvoices[0].id,
      branchId: mainShop.id,
      customerId: customers[0].id,
      totalRefund: 350,
      reason: 'Size mismatch',
      items: { create: [{ variantId: returnVariant.id, quantity: 1, refundAmount: 350 }] },
    },
  });

  const onlineReturn = await prisma.return.create({
    data: {
      returnType: ReturnType.ONLINE_ORDER,
      onlineOrderId: createdOnlineOrders[0].id,
      branchId: warehouse.id,
      customerId: customers[5].id,
      totalRefund: 1200,
      reason: 'Defective product',
      items: { create: [{ variantId: createdVariants[2].id, quantity: 1, refundAmount: 1200 }] },
    },
  });

  // ─────────────────────────────────────────────
  // 15. STOCK MOVEMENTS
  // ─────────────────────────────────────────────
  console.log('Seeding stock movements...');
  const movementTypes = ['PURCHASE', 'SALE', 'RETURN', 'TRANSFER_IN', 'TRANSFER_OUT'];
  for (let i = 0; i < 10; i++) {
    await prisma.stockMovement.create({
      data: {
        variantId: createdVariants[i % createdVariants.length].id,
        branchId: branches[i % branches.length].id,
        type: movementTypes[i % movementTypes.length],
        quantity: (i + 1) * 5,
        referenceId: null,
      },
    });
  }

  // ─────────────────────────────────────────────
  // 16. STOCK TRANSFERS
  // ─────────────────────────────────────────────
  console.log('Seeding stock transfers...');
  const transferDefs = [
    { from: warehouse, to: mainShop,   status: TransferStatus.COMPLETED, items: [0, 1, 2] },
    { from: warehouse, to: northShop,  status: TransferStatus.APPROVED,  items: [3, 4] },
    { from: warehouse, to: southShop,  status: TransferStatus.PENDING,   items: [5, 6] },
    { from: mainShop,  to: northShop,  status: TransferStatus.PENDING,   items: [7, 8] },
  ];

  for (const def of transferDefs) {
    await prisma.stockTransfer.create({
      data: {
        fromBranchId: def.from.id,
        toBranchId: def.to.id,
        status: def.status,
        items: {
          create: def.items.map(idx => ({
            variantId: createdVariants[idx % createdVariants.length].id,
            quantity: Math.floor(Math.random() * 20) + 5,
          })),
        },
      },
    });
  }

  // ─────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────
  console.log('\n✅ Database seeded successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🔑 Login Credentials');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin    : admin@kingfox.com     / Admin@1234');
  console.log('  Manager1 : manager1@kingfox.com  / Manager@123');
  console.log('  Manager2 : manager2@kingfox.com  / Manager@123');
  console.log('  Staff1   : staff1@kingfox.com    / Staff@123');
  console.log('  Staff2   : staff2@kingfox.com    / Staff@123');
  console.log('  Cashier  : cashier1@kingfox.com  / Cashier@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
