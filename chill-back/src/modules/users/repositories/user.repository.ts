import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IUser } from '../interfaces/user.interface';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByFingerprint(fingerprint: string): Promise<IUser | null> {
    const user = await this.prisma.userIdentity.findUnique({ where: { fingerprint } });
    if (!user) return null;
    return {
      id: user.id,
      ipAddress: user.ipAddress,
      fingerprint: user.fingerprint,
      userName: user.userName ?? undefined,
      userAgent: user.userAgent ?? undefined,
      timezone: user.timezone ?? undefined,
      language: user.language ?? undefined,
      firstVisit: new Date(user.firstVisit),
      lastVisit: new Date(user.lastVisit),
      visitCount: user.visitCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async create(data: IUser): Promise<IUser> {
    const user = await this.prisma.userIdentity.create({
      data: {
        ipAddress: data.ipAddress,
        fingerprint: data.fingerprint,
        userName: data.userName,
        userAgent: data.userAgent,
        timezone: data.timezone,
        language: data.language,
        firstVisit: data.firstVisit.toISOString(),
        lastVisit: data.lastVisit.toISOString(),
        visitCount: data.visitCount ?? 1,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
    });
    return {
      id: user.id,
      ipAddress: user.ipAddress,
      fingerprint: user.fingerprint,
      userName: user.userName ?? undefined,
      userAgent: user.userAgent ?? undefined,
      timezone: user.timezone ?? undefined,
      language: user.language ?? undefined,
      firstVisit: new Date(user.firstVisit),
      lastVisit: new Date(user.lastVisit),
      visitCount: user.visitCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async update(id: number, data: Partial<IUser>): Promise<IUser> {
    const user = await this.prisma.userIdentity.update({
      where: { id },
      data: {
        ipAddress: data.ipAddress,
        fingerprint: data.fingerprint,
        userName: data.userName,
        userAgent: data.userAgent,
        timezone: data.timezone,
        language: data.language,
        firstVisit: data.firstVisit ? data.firstVisit.toISOString() : undefined,
        lastVisit: data.lastVisit ? data.lastVisit.toISOString() : undefined,
        visitCount: data.visitCount,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
    });
    return {
      id: user.id,
      ipAddress: user.ipAddress,
      fingerprint: user.fingerprint,
      userName: user.userName ?? undefined,
      userAgent: user.userAgent ?? undefined,
      timezone: user.timezone ?? undefined,
      language: user.language ?? undefined,
      firstVisit: new Date(user.firstVisit),
      lastVisit: new Date(user.lastVisit),
      visitCount: user.visitCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
