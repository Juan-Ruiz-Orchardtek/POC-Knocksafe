import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AdminLoginDto, RepLoginDto } from '@knocksafe/shared/dto';
import { AdminEntity, RepEntity } from '@knocksafe/shared/database';
import { AuthUser } from '@knocksafe/shared/types';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminEntity)
    private readonly adminsRepo: Repository<AdminEntity>,
    @InjectRepository(RepEntity)
    private readonly repsRepo: Repository<RepEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async adminLogin(dto: AdminLoginDto) {
    const admin = await this.adminsRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (!admin || !(await bcrypt.compare(dto.password, admin.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildToken({
      id: admin.id,
      email: admin.email,
      role: 'admin',
      name: admin.name,
    });
  }

  async repLogin(dto: RepLoginDto) {
    const rep = await this.repsRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (!rep || !(await bcrypt.compare(dto.password, rep.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildToken({
      id: rep.id,
      email: rep.email,
      role: 'rep',
      repId: rep.id,
      organizationId: rep.organizationId,
      name: `${rep.firstName} ${rep.lastName}`,
    });
  }

  private buildToken(user: AuthUser) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      repId: user.repId,
      organizationId: user.organizationId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        repId: user.repId,
        organizationId: user.organizationId,
      },
    };
  }
}
