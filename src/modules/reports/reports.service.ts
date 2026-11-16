import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, PipelineStage } from 'mongoose';
import { Visit, VisitDocument } from '../visits/schemas/visit.schema';
import { Visitor, VisitorDocument } from '../visitors/schemas/visitor.schema';
import { VisitStatus } from '../../common/enums/visit-status.enum';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Visit.name)
    private readonly visitModel: Model<VisitDocument>,
    @InjectModel(Visitor.name)
    private readonly visitorModel: Model<VisitorDocument>,
  ) {}

  async getSummary(organizationId?: string) {
    const orgFilter = organizationId ? { organizationId: new Types.ObjectId(organizationId) } : {};

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      visitorsToday,
      visitorsThisWeek,
      visitorsThisMonth,
      activeVisitors,
      completedVisits,
      pendingApprovals,
      rejectedVisits,
      totalVisitors,
    ] = await Promise.all([
      this.visitModel.countDocuments({ ...orgFilter, scheduledDate: { $gte: startOfToday } }),
      this.visitModel.countDocuments({ ...orgFilter, scheduledDate: { $gte: startOfWeek } }),
      this.visitModel.countDocuments({ ...orgFilter, scheduledDate: { $gte: startOfMonth } }),
      this.visitModel.countDocuments({ ...orgFilter, status: VisitStatus.CHECKED_IN }),
      this.visitModel.countDocuments({ ...orgFilter, status: VisitStatus.CHECKED_OUT }),
      this.visitModel.countDocuments({ ...orgFilter, status: VisitStatus.PENDING_APPROVAL }),
      this.visitModel.countDocuments({ ...orgFilter, status: VisitStatus.REJECTED }),
      this.visitorModel.countDocuments(orgFilter),
    ]);

    return {
      visitorsToday,
      visitorsThisWeek,
      visitorsThisMonth,
      activeVisitors,
      completedVisits,
      pendingApprovals,
      rejectedVisits,
      totalVisitors,
    };
  }

  async getVisitorTrends(organizationId?: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const matchStage: any = {
      scheduledDate: { $gte: startDate },
    };
    if (organizationId) {
      matchStage.organizationId = new Types.ObjectId(organizationId);
    }

    const pipeline: PipelineStage[] = [
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$scheduledDate' } },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', VisitStatus.CHECKED_OUT] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', VisitStatus.REJECTED] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 as const } },
    ];

    const results = await this.visitModel.aggregate(pipeline).exec();

    // Fill missing dates
    const dateMap = new Map(results.map((r: any) => [r._id, r]));
    const trend = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().split('T')[0];
      const entry = dateMap.get(dateKey);
      trend.push({
        date: dateKey,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        total: entry ? entry.total : 0,
        completed: entry ? entry.completed : 0,
        rejected: entry ? entry.rejected : 0,
      });
    }

    return trend;
  }

  async getDepartmentStats(organizationId?: string) {
    const matchStage: any = { departmentId: { $ne: null } };
    if (organizationId) {
      matchStage.organizationId = new Types.ObjectId(organizationId);
    }

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      {
        $group: {
          _id: '$departmentId',
          visitCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'department',
        },
      },
      { $unwind: '$department' },
      {
        $project: {
          _id: 1,
          departmentName: '$department.name',
          visitCount: 1,
        },
      },
      { $sort: { visitCount: -1 as const } },
      { $limit: 10 },
    ];

    return this.visitModel.aggregate(pipeline).exec();
  }

  async getTopHosts(organizationId?: string) {
    const matchStage: any = { hostId: { $ne: null } };
    if (organizationId) {
      matchStage.organizationId = new Types.ObjectId(organizationId);
    }

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      {
        $group: {
          _id: '$hostId',
          visitCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employee',
        },
      },
      { $unwind: '$employee' },
      {
        $project: {
          _id: 1,
          fullName: '$employee.fullName',
          designation: '$employee.designation',
          visitCount: 1,
        },
      },
      { $sort: { visitCount: -1 as const } },
      { $limit: 10 },
    ];

    return this.visitModel.aggregate(pipeline).exec();
  }

  async exportVisitorLogsCsv(organizationId?: string, startDate?: string, endDate?: string): Promise<string> {
    const query: any = {};
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    const visits = await this.visitModel
      .find(query)
      .populate('organizationId', 'name')
      .populate('visitorId', 'fullName phone email company')
      .populate('hostId', 'fullName email employeeId')
      .populate('departmentId', 'name')
      .populate('buildingId', 'name locationCode')
      .sort({ scheduledDate: -1 })
      .exec();

    // CSV header
    const headers = [
      'Pass Code',
      'Organization',
      'Visitor Name',
      'Visitor Phone',
      'Visitor Email',
      'Visitor Company',
      'Host Name',
      'Department',
      'Purpose',
      'Scheduled Date',
      'Status',
      'Check-In Time',
      'Check-Out Time',
    ];

    const rows = visits.map((v: any) => {
      return [
        `"${v.passCode || ''}"`,
        `"${v.organizationId?.name || ''}"`,
        `"${v.visitorId?.fullName || ''}"`,
        `"${v.visitorId?.phone || ''}"`,
        `"${v.visitorId?.email || ''}"`,
        `"${v.visitorId?.company || ''}"`,
        `"${v.hostId?.fullName || ''}"`,
        `"${v.departmentId?.name || ''}"`,
        `"${(v.purpose || '').replace(/"/g, '""')}"`,
        `"${v.scheduledDate ? new Date(v.scheduledDate).toISOString().split('T')[0] : ''}"`,
        `"${v.status}"`,
        `"${v.checkInAt ? new Date(v.checkInAt).toISOString() : ''}"`,
        `"${v.checkOutAt ? new Date(v.checkOutAt).toISOString() : ''}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
