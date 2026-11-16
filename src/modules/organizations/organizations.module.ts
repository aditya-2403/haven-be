import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { OrganizationSettings, OrganizationSettingsSchema } from '../settings/schemas/organization-settings.schema';
import { Visit, VisitSchema } from '../visits/schemas/visit.schema';
import { Visitor, VisitorSchema } from '../visitors/schemas/visitor.schema';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
      { name: OrganizationSettings.name, schema: OrganizationSettingsSchema },
      { name: Visit.name, schema: VisitSchema },
      { name: Visitor.name, schema: VisitorSchema },
    ]),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}

