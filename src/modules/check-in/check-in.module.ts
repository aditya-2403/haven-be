import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Visit, VisitSchema } from '../visits/schemas/visit.schema';
import { Visitor, VisitorSchema } from '../visitors/schemas/visitor.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { CheckInService } from './check-in.service';
import { CheckInController } from './check-in.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Visit.name, schema: VisitSchema },
      { name: Visitor.name, schema: VisitorSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  controllers: [CheckInController],
  providers: [CheckInService],
  exports: [CheckInService],
})
export class CheckInModule {}

