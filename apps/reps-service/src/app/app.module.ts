import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig, RepEntity } from '@knocksafe/shared/database';
import { JwtStrategy } from '@knocksafe/shared/auth';
import { HealthController, RepsController } from './reps.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([RepEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    HttpModule,
  ],
  controllers: [HealthController, RepsController],
  providers: [JwtStrategy],
})
export class AppModule {}
