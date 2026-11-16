import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Visit, VisitSchema } from './schemas/visit.schema';
import { Visitor, VisitorSchema } from '../visitors/schemas/visitor.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { OrganizationSettings, OrganizationSettingsSchema } from '../settings/schemas/organization-settings.schema';
import { VisitsService } from './visits.service';
import { VisitsController } from './visits.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Visit.name, schema: VisitSchema },
      { name: Visitor.name, schema: VisitorSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: OrganizationSettings.name, schema: OrganizationSettingsSchema },
    ]),
  ],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [VisitsService],
})
export class VisitsModule {}

