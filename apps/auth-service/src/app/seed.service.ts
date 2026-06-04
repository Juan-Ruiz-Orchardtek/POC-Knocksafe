import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  AdminEntity,
  OrganizationEntity,
  RepEntity,
} from '@knocksafe/shared/database';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(AdminEntity)
    private readonly adminsRepo: Repository<AdminEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly orgsRepo: Repository<OrganizationEntity>,
    @InjectRepository(RepEntity)
    private readonly repsRepo: Repository<RepEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedAdmin();
    await this.seedSampleData();
  }

  private async seedAdmin(): Promise<void> {
    const existing = await this.adminsRepo.findOne({
      where: { email: 'admin@knocksafe.com' },
    });

    if (existing) {
      return;
    }

    await this.adminsRepo.save({
      id: uuidv4(),
      email: 'admin@knocksafe.com',
      name: 'POC Admin',
      passwordHash: await bcrypt.hash('Admin123!', 10),
    });

    this.logger.log('Seeded admin: admin@knocksafe.com / Admin123!');
  }

  private async seedSampleData(): Promise<void> {
    const orgCount = await this.orgsRepo.count();
    if (orgCount > 0) {
      return;
    }

    const org = await this.orgsRepo.save({
      id: uuidv4(),
      name: 'Acme Corp',
    });

    await this.repsRepo.save({
      id: uuidv4(),
      organizationId: org.id,
      email: 'rep@knocksafe.com',
      firstName: 'Jane',
      lastName: 'Seller',
      phone: '+34 600 000 001',
      passwordHash: await bcrypt.hash('Rep123!', 10),
    });

    this.logger.log('Seeded sample org "Acme Corp" and rep rep@knocksafe.com / Rep123!');
  }
}
