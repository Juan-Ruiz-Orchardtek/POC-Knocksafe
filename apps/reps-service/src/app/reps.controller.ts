import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard, Roles, RolesGuard } from '@knocksafe/shared/auth';
import { CreateRepDto, UpdateRepDto } from '@knocksafe/shared/dto';
import {
  ORGANIZATIONS_SERVICE_URL,
  RepEntity,
} from '@knocksafe/shared/database';
import { JwtPayload, Organization, Rep } from '@knocksafe/shared/types';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'reps-service' };
  }
}

@Controller('reps')
export class RepsController {
  constructor(
    @InjectRepository(RepEntity)
    private readonly repsRepo: Repository<RepEntity>,
    private readonly httpService: HttpService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll(): Promise<Rep[]> {
    const rows = await this.repsRepo.find({ order: { lastName: 'ASC' } });
    return rows.map((row) => this.toDto(row));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('rep')
  async me(@Req() req: { user: JwtPayload }): Promise<Rep & { organization?: Organization }> {
    const repId = req.user.repId ?? req.user.sub;
    const row = await this.repsRepo.findOne({ where: { id: repId } });
    if (!row) {
      throw new NotFoundException('Rep not found');
    }

    const organization = await this.fetchOrganization(row.organizationId);
    return { ...this.toDto(row), organization: organization ?? undefined };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findOne(@Param('id') id: string): Promise<Rep> {
    const row = await this.repsRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Rep not found');
    }
    return this.toDto(row);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async create(@Body() dto: CreateRepDto): Promise<Rep> {
    await this.ensureOrganizationExists(dto.organizationId);

    const existing = await this.repsRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const row = await this.repsRepo.save({
      id: uuidv4(),
      organizationId: dto.organizationId,
      email: dto.email.toLowerCase(),
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: dto.phone?.trim() ?? null,
      passwordHash: await bcrypt.hash(dto.password, 10),
    });

    return this.toDto(row);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRepDto,
  ): Promise<Rep> {
    const row = await this.repsRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Rep not found');
    }

    if (dto.organizationId) {
      await this.ensureOrganizationExists(dto.organizationId);
      row.organizationId = dto.organizationId;
    }

    if (dto.email) {
      row.email = dto.email.toLowerCase();
    }
    if (dto.firstName) {
      row.firstName = dto.firstName.trim();
    }
    if (dto.lastName) {
      row.lastName = dto.lastName.trim();
    }
    if (dto.phone !== undefined) {
      row.phone = dto.phone?.trim() ?? null;
    }
    if (dto.password) {
      row.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const saved = await this.repsRepo.save(row);
    return this.toDto(saved);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const result = await this.repsRepo.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Rep not found');
    }
    return { deleted: true };
  }

  private async ensureOrganizationExists(organizationId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.get(`${ORGANIZATIONS_SERVICE_URL}/organizations/${organizationId}`),
      );
    } catch {
      throw new BadRequestException('Organization does not exist');
    }
  }

  private async fetchOrganization(
    organizationId: string,
  ): Promise<Organization | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<Organization>(
          `${ORGANIZATIONS_SERVICE_URL}/organizations/${organizationId}`,
        ),
      );
      return response.data;
    } catch {
      return null;
    }
  }

  private toDto(row: RepEntity): Rep {
    return {
      id: row.id,
      organizationId: row.organizationId,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
