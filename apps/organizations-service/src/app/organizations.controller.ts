import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard, Roles, RolesGuard } from '@knocksafe/shared/auth';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from '@knocksafe/shared/dto';
import { OrganizationEntity } from '@knocksafe/shared/database';
import { Organization } from '@knocksafe/shared/types';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'organizations-service' };
  }
}

@Controller('organizations')
export class OrganizationsController {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly orgsRepo: Repository<OrganizationEntity>,
  ) {}

  @Get()
  async findAll(): Promise<Organization[]> {
    const rows = await this.orgsRepo.find({ order: { name: 'ASC' } });
    return rows.map((row) => this.toDto(row));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Organization> {
    const row = await this.orgsRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Organization not found');
    }
    return this.toDto(row);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async create(@Body() dto: CreateOrganizationDto): Promise<Organization> {
    const row = await this.orgsRepo.save({
      id: uuidv4(),
      name: dto.name.trim(),
    });
    return this.toDto(row);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const row = await this.orgsRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Organization not found');
    }
    row.name = dto.name.trim();
    const saved = await this.orgsRepo.save(row);
    return this.toDto(saved);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const result = await this.orgsRepo.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Organization not found');
    }
    return { deleted: true };
  }

  private toDto(row: OrganizationEntity): Organization {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
