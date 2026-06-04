import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdminEntity,
  getDatabaseConfig,
  JWT_SECRET,
  OrganizationEntity,
  RepEntity,
} from '@knocksafe/shared/database';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([AdminEntity, OrganizationEntity, RepEntity]),
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SeedService],
})
export class AppModule {}
