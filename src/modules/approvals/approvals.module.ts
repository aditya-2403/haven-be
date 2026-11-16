import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Approval, ApprovalSchema } from './schemas/approval.schema';
import { Visit, VisitSchema } from '../visits/schemas/visit.schema';
import { Visitor, VisitorSchema } from '../visitors/schemas/visitor.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { OrganizationSettings, OrganizationSettingsSchema } from '../settings/schemas/organization-settings.schema';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Approval.name, schema: ApprovalSchema },
      { name: Visit.name, schema: VisitSchema },
      { name: Visitor.name, schema: VisitorSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: OrganizationSettings.name, schema: OrganizationSettingsSchema },
    ]),
  ],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}

