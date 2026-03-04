import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface CreateUserInput {
  name: string;
  email: string;
  password?: string;
  roleId?: number;
  branchId?: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = input.password ? await bcrypt.hash(input.password, 10) : null;

    // Find or use default role
    let roleId = input.roleId;
    if (!roleId) {
      const defaultRole = await this.prisma.role.findFirst({ where: { name: 'staff' } });
      if (!defaultRole) throw new ConflictException('Default role not found. Please seed roles first.');
      roleId = Number(defaultRole.id);
    }

    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        roleId: BigInt(roleId),
        branchId: input.branchId ? BigInt(input.branchId) : null,
      },
      include: { role: true, branch: true },
    });

    const { password: _, ...result } = user;
    return result;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        branchId: true,
        roleId: true,
        role: true,
        branch: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string | number) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        branchId: true,
        roleId: true,
        role: true,
        branch: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  async update(id: string | number, data: Partial<CreateUserInput>) {
    await this.findOne(id);
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);
    if (data.roleId) updateData.roleId = BigInt(data.roleId);
    if (data.branchId) updateData.branchId = BigInt(data.branchId);

    const user = await this.prisma.user.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: { role: true },
    });
    const { password: _, ...result } = user;
    return result;
  }

  async remove(id: string | number) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id: BigInt(id) } });
    return { message: `User with ID ${id} deleted successfully` };
  }
}
