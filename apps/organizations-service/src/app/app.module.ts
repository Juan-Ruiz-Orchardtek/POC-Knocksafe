import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  getDatabaseConfig,
  OrganizationEntity,
} from '@knocksafe/shared/database';
import { JwtStrategy } from '@knocksafe/shared/auth';
import {
  HealthController,
  OrganizationsController,
} from './organizations.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([OrganizationEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [OrganizationsController, HealthController],
  providers: [JwtStrategy],
})
export class AppModule {}
