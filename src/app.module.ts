import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import configuration from './config/configuration';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { VisitorsModule } from './modules/visitors/visitors.module';
import { VisitsModule } from './modules/visits/visits.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { CheckInModule } from './modules/check-in/check-in.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('database.uri'),
        dbName: config.get<string>('database.dbName') || 'haven',
      }),
    }),
    AuditLogsModule,
    NotificationsModule,
    StorageModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    EmployeesModule,
    DepartmentsModule,
    BuildingsModule,
    VisitorsModule,
    VisitsModule,
    ApprovalsModule,
    CheckInModule,
    ReportsModule,
    SettingsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}

