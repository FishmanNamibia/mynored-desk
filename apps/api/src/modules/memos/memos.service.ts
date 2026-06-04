import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateMemoDto, UpdateMemoDto } from "./dto";
import prisma from "@mynsa-desk/database";
import { Prisma } from "@prisma/client";

@Injectable()
export class MemosService {
  private prisma = prisma;

  async create(createMemoDto: CreateMemoDto): Promise<any> {
    const { createdById, status, priority, memoThrough, ...rest } = createMemoDto;

    // Auto-calculate available funds if financial data provided
    const availableFunds = 
      rest.budgetedAmount !== undefined && rest.amountSpent !== undefined
        ? Number(rest.budgetedAmount) - Number(rest.amountSpent)
        : undefined;

    // Provide default values for required fields if they're empty (for drafts)
    const memoData = {
      memoTo: rest.memoTo || '',
      memoFrom: rest.memoFrom || '',
      subject: rest.subject || '',
      purpose: rest.purpose || '',
      recommendation: rest.recommendation || '',
      memoToTitle: rest.memoToTitle,
      memoFromTitle: rest.memoFromTitle,
      memoDate: rest.memoDate ? new Date(rest.memoDate) : new Date(),
      procurementActivity: rest.procurementActivity,
      budgetVote: rest.budgetVote,
      budgetedAmount: rest.budgetedAmount !== undefined ? Number(rest.budgetedAmount) : null,
      amountSpent: rest.amountSpent !== undefined ? Number(rest.amountSpent) : null,
      availableFunds: availableFunds !== undefined ? availableFunds : null,
      executiveName: rest.executiveName,
      financialVerification: rest.financialVerification,
      budgetApproved: rest.budgetApproved,
      financialComments: rest.financialComments,
      executiveSignatureDate: rest.executiveSignatureDate ? new Date(rest.executiveSignatureDate) : null,
      executiveSignaturePath: rest.executiveSignaturePath,
      attachments: rest.attachments,
      memoThrough: (memoThrough as unknown) as Prisma.InputJsonValue,
      createdById,
      status: (status ?? "DRAFT") as any,
      priority: (priority ?? "NORMAL") as any,
      id: require('crypto').randomUUID(),
      updatedAt: new Date(),
    };

    return this.prisma.memo.create({
      data: memoData as any,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            position: true,
            departmentName: true,
          },
        },
      },
    });
  }

  async findAll(userId?: string, status?: string): Promise<any[]> {
    const where: any = {};
    
    if (userId) {
      where.createdById = userId;
    }
    
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    return this.prisma.memo.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            position: true,
            departmentName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<any> {
    const memo = await this.prisma.memo.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            position: true,
            departmentName: true,
          },
        },
      },
    });

    if (!memo) {
      throw new NotFoundException(`Memo with ID ${id} not found`);
    }

    return memo;
  }

  async update(id: string, updateMemoDto: UpdateMemoDto): Promise<any> {
    // Check if memo exists
    await this.findOne(id);

    const { memoThrough, ...rest } = updateMemoDto;

    // Auto-calculate available funds if financial data is being updated
    const availableFunds = 
      rest.budgetedAmount !== undefined && rest.amountSpent !== undefined
        ? Number(rest.budgetedAmount) - Number(rest.amountSpent)
        : undefined;

    const data: any = { ...rest };
    
    if (memoThrough !== undefined) {
      data.memoThrough = (memoThrough as unknown) as Prisma.InputJsonValue;
    }
    
    if (rest.budgetedAmount !== undefined) {
      data.budgetedAmount = Number(rest.budgetedAmount);
    }
    
    if (rest.amountSpent !== undefined) {
      data.amountSpent = Number(rest.amountSpent);
    }
    
    if (availableFunds !== undefined) {
      data.availableFunds = availableFunds;
    }

    return this.prisma.memo.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            position: true,
            departmentName: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: string): Promise<any> {
    await this.findOne(id);

    return this.prisma.memo.update({
      where: { id },
      data: { status: status.toUpperCase() as any },
    });
  }

  async remove(id: string): Promise<any> {
    await this.findOne(id);

    return this.prisma.memo.delete({
      where: { id },
    });
  }
}
