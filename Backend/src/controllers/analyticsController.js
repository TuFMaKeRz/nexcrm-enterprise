const Lead = require('../models/Lead');
const LeadSource = require('../models/LeadSource');
const LeadStatus = require('../models/LeadStatus');
const Deal = require('../models/Deal');
const Pipeline = require('../models/Pipeline');
const Customer = require('../models/Customer');
const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

// ============================================================
// EXECUTIVE DASHBOARD ANALYTICS
// GET /api/v1/analytics/dashboard
// ============================================================
const getExecutiveDashboard = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Parallel Aggregations for Key Metrics
    const [
      totalLeadsCount,
      convertedLeadsCount,
      allDeals,
      allInvoices,
      overdueTasksCount,
      todayTasks,
      todayActivities,
      recentWonDeals
    ] = await Promise.all([
      Lead.countDocuments({ organizationId: orgId, isArchived: false }),
      Lead.countDocuments({ organizationId: orgId, isArchived: false, isConverted: true }),
      Deal.find({ organizationId: orgId, isArchived: false }).select('value status stageId probability assignedTo customerId title'),
      Invoice.find({ organizationId: orgId, isArchived: false }).select('grandTotal paidAmount balanceDue status issueDate createdAt'),
      Task.countDocuments({
        organizationId: orgId,
        isArchived: false,
        status: { $ne: 'Completed' },
        dueDate: { $lt: now }
      }),
      Task.find({
        organizationId: orgId,
        isArchived: false,
        dueDate: { $gte: startOfToday, $lte: endOfToday }
      })
        .populate('assignedTo', 'firstName lastName')
        .limit(6),
      Activity.find({
        organizationId: orgId,
        isArchived: false,
        scheduledAt: { $gte: startOfToday, $lte: endOfToday }
      })
        .populate('performedBy', 'firstName lastName')
        .limit(6),
      Deal.find({ organizationId: orgId, isArchived: false, status: 'Won' })
        .populate('customerId', 'name companyName')
        .populate('assignedTo', 'firstName lastName')
        .sort({ updatedAt: -1 })
        .limit(5)
    ]);

    // Financial Metrics
    let totalInvoiced = 0;
    let totalCollected = 0;
    let mtdCollected = 0;
    let totalReceivables = 0;

    allInvoices.forEach((inv) => {
      totalInvoiced += inv.grandTotal || 0;
      totalCollected += inv.paidAmount || 0;
      totalReceivables += inv.balanceDue || 0;

      const invDate = new Date(inv.issueDate || inv.createdAt);
      if (invDate >= startOfMonth && inv.paidAmount) {
        mtdCollected += inv.paidAmount;
      }
    });

    // Deals Metrics
    let totalPipelineValue = 0;
    let wonDealsCount = 0;
    let wonDealsValue = 0;
    let openDealsCount = 0;

    allDeals.forEach((d) => {
      if (d.status === 'Won') {
        wonDealsCount++;
        wonDealsValue += d.value || 0;
      } else if (d.status === 'Open' || !d.status) {
        openDealsCount++;
        totalPipelineValue += d.value || 0;
      }
    });

    const winRate = allDeals.length > 0 ? Math.round((wonDealsCount / allDeals.length) * 100) : 0;
    const leadConversionRate = totalLeadsCount > 0 ? Math.round((convertedLeadsCount / totalLeadsCount) * 100) : 0;

    // 2. Visual Sales Funnel Aggregation
    const defaultPipeline = await Pipeline.findOne({ organizationId: orgId, isDefault: true }) ||
      await Pipeline.findOne({ organizationId: orgId });

    let funnelStages = [];
    if (defaultPipeline && defaultPipeline.stages && defaultPipeline.stages.length > 0) {
      funnelStages = defaultPipeline.stages.map((stg, idx) => {
        const stageDeals = allDeals.filter(
          (d) => String(d.stageId) === String(stg._id) || String(d.stageId) === String(idx)
        );
        const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
        return {
          id: stg._id || idx,
          name: stg.name,
          color: stg.color || '#6366f1',
          count: stageDeals.length,
          value: Math.round(stageValue),
          probability: stg.probability || 20
        };
      });
    } else {
      const standardStages = [
        { name: 'Discovery / Demo', color: '#6366f1', prob: 20 },
        { name: 'Proposal Sent', color: '#8b5cf6', prob: 40 },
        { name: 'Negotiation', color: '#ec4899', prob: 70 },
        { name: 'Won Deals', color: '#10b981', prob: 100 }
      ];
      funnelStages = standardStages.map((stg, idx) => {
        const isWonStage = idx === 3;
        const stageDeals = allDeals.filter((d) => (isWonStage ? d.status === 'Won' : d.status === 'Open'));
        const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
        return {
          id: idx,
          name: stg.name,
          color: stg.color,
          count: stageDeals.length,
          value: Math.round(stageValue),
          probability: stg.prob
        };
      });
    }

    // 3. 6-Month Monthly Revenue History (Invoiced vs Collected)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const mName = d.toLocaleString('default', { month: 'short' });

      let mInvoiced = 0;
      let mPaid = 0;

      allInvoices.forEach((inv) => {
        const iDate = new Date(inv.issueDate || inv.createdAt);
        if (iDate >= d && iDate <= mEnd) {
          mInvoiced += inv.grandTotal || 0;
          mPaid += inv.paidAmount || 0;
        }
      });

      monthlyRevenue.push({
        month: mName,
        year: d.getFullYear(),
        invoiced: Math.round(mInvoiced),
        collected: Math.round(mPaid)
      });
    }

    return ApiResponse.success(res, 'Executive Dashboard data fetched', {
      kpis: {
        totalLeads: totalLeadsCount,
        leadConversionRate,
        openDealsCount,
        totalPipelineValue: Math.round(totalPipelineValue),
        wonDealsCount,
        wonDealsValue: Math.round(wonDealsValue),
        winRate,
        mtdRevenue: Math.round(mtdCollected || totalCollected),
        totalInvoiced: Math.round(totalInvoiced),
        totalCollected: Math.round(totalCollected),
        totalReceivables: Math.round(totalReceivables),
        overdueTasksCount
      },
      funnel: funnelStages,
      funnelStages,
      monthlyRevenueTrend: monthlyRevenue,
      monthlyRevenue,
      todayActionCenter: {
        tasksDueToday: todayTasks,
        followUpsDue: todayActivities,
        recentWonDeals: recentWonDeals.map((d) => ({
          _id: d._id,
          title: d.title,
          value: d.value,
          customerName: d.customerId?.companyName || d.customerId?.name || 'Customer',
          repName: d.assignedTo ? `${d.assignedTo.firstName} ${d.assignedTo.lastName}` : 'Direct'
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// LEAD SOURCE & CONVERSION REPORTS
// GET /api/v1/analytics/lead-reports
// ============================================================
const getLeadReports = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const leads = await Lead.find({ organizationId: orgId, isArchived: false })
      .populate('source', 'name')
      .populate('status', 'name')
      .select('source status score temperature isConverted expectedValue createdAt');

    // 1. Leads by Source
    const sourceMap = {};
    leads.forEach((l) => {
      const srcName = l.source?.name || 'Direct / Organic';
      if (!sourceMap[srcName]) {
        sourceMap[srcName] = { source: srcName, totalLeads: 0, convertedCount: 0, totalValue: 0 };
      }
      sourceMap[srcName].totalLeads++;
      if (l.isConverted) sourceMap[srcName].convertedCount++;
      sourceMap[srcName].totalValue += l.expectedValue || 0;
    });

    const sourceBreakdown = Object.values(sourceMap).map((s) => ({
      ...s,
      conversionRate: s.totalLeads > 0 ? Math.round((s.convertedCount / s.totalLeads) * 100) : 0
    }));

    // 2. Score Distribution (Cold, Warm, Hot, Very Hot)
    const scoreTiers = {
      Cold: 0,
      Warm: 0,
      Hot: 0,
      'Very Hot': 0
    };

    leads.forEach((l) => {
      const temp = l.temperature || (l.score > 80 ? 'Very Hot' : l.score > 60 ? 'Hot' : l.score > 30 ? 'Warm' : 'Cold');
      if (scoreTiers[temp] !== undefined) {
        scoreTiers[temp]++;
      } else {
        scoreTiers.Cold++;
      }
    });

    const totalConverted = leads.filter((l) => l.isConverted).length;
    const conversionRate = leads.length > 0 ? Math.round((totalConverted / leads.length) * 100) : 0;

    return ApiResponse.success(res, 'Lead reports fetched', {
      totalLeads: leads.length,
      conversionRate,
      sourceBreakdown,
      sourcesReport: sourceBreakdown,
      scoreTiers,
      scoreDistribution: scoreTiers
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// SALES REP PERFORMANCE LEADERBOARD
// GET /api/v1/analytics/sales-rep-performance
// ============================================================
const getSalesRepPerformance = async (req, res, next) => {
  try {
    const orgId = req.organizationId;

    const [users, leads, deals, tasks, activities] = await Promise.all([
      User.find({ organizationId: orgId, isActive: true })
        .populate('role', 'name')
        .select('firstName lastName email avatar role'),
      Lead.find({ organizationId: orgId, isArchived: false }).select('assignedTo isConverted expectedValue'),
      Deal.find({ organizationId: orgId, isArchived: false }).select('assignedTo status value'),
      Task.find({ organizationId: orgId, isArchived: false }).select('assignedTo status'),
      Activity.find({ organizationId: orgId, isArchived: false }).select('performedBy channel')
    ]);

    const repMatrix = users.map((u) => {
      const uIdStr = u._id.toString();

      const userLeads = leads.filter((l) => l.assignedTo && l.assignedTo.toString() === uIdStr);
      const userDeals = deals.filter((d) => d.assignedTo && d.assignedTo.toString() === uIdStr);
      const userWonDeals = userDeals.filter((d) => d.status === 'Won');
      const userTasks = tasks.filter((t) => t.assignedTo && t.assignedTo.toString() === uIdStr);
      const userCompletedTasks = userTasks.filter((t) => t.status === 'Completed');
      const userActivities = activities.filter((a) => a.performedBy && a.performedBy.toString() === uIdStr);

      const revenueGenerated = userWonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      const winRate = userDeals.length > 0 ? Math.round((userWonDeals.length / userDeals.length) * 100) : 0;
      const leadConversion = userLeads.length > 0
        ? Math.round((userLeads.filter((l) => l.isConverted).length / userLeads.length) * 100)
        : 0;

      return {
        userId: u._id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role?.name || 'Sales Executive',
        leadsAssigned: userLeads.length,
        leadConversionRate: leadConversion,
        dealsHandled: userDeals.length,
        dealsWon: userWonDeals.length,
        winRate,
        revenueGenerated: Math.round(revenueGenerated),
        tasksCompleted: userCompletedTasks.length,
        activitiesLogged: userActivities.length
      };
    });

    // Sort by revenue generated descending
    repMatrix.sort((a, b) => b.revenueGenerated - a.revenueGenerated);

    return ApiResponse.success(res, 'Sales rep performance matrix fetched', {
      leaderboard: repMatrix,
      data: repMatrix
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// FINANCIAL & INVOICING BREAKDOWN REPORTS
// GET /api/v1/analytics/financial-reports
// ============================================================
const getFinancialReports = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const invoices = await Invoice.find({ organizationId: orgId, isArchived: false })
      .populate('customer', 'name companyName')
      .select('invoiceNumber grandTotal paidAmount balanceDue status paymentTerms dueDate payments createdAt');

    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueReceivables = 0;

    const paymentMethodsBreakdown = {
      UPI: 0,
      'Bank Transfer': 0,
      Card: 0,
      Cash: 0,
      Cheque: 0,
      Other: 0
    };

    const statusCounts = {
      Paid: 0,
      'Partially Paid': 0,
      Unpaid: 0,
      Overdue: 0
    };

    const now = new Date();

    invoices.forEach((inv) => {
      totalInvoiced += inv.grandTotal || 0;
      totalCollected += inv.paidAmount || 0;
      totalOutstanding += inv.balanceDue || 0;

      if (inv.status === 'Paid') {
        statusCounts.Paid++;
      } else if (inv.status === 'Partially Paid') {
        statusCounts['Partially Paid']++;
      } else if (inv.dueDate && new Date(inv.dueDate) < now) {
        statusCounts.Overdue++;
        overdueReceivables += inv.balanceDue || 0;
      } else {
        statusCounts.Unpaid++;
      }

      // Aggregate payments by method
      (inv.payments || []).forEach((p) => {
        const m = p.paymentMethod || 'Bank Transfer';
        if (paymentMethodsBreakdown[m] !== undefined) {
          paymentMethodsBreakdown[m] += p.amount || 0;
        } else {
          paymentMethodsBreakdown.Other += p.amount || 0;
        }
      });
    });

    const summary = {
      totalInvoiced: Math.round(totalInvoiced),
      totalCollected: Math.round(totalCollected),
      totalOutstanding: Math.round(totalOutstanding),
      overdueReceivables: Math.round(overdueReceivables),
      collectionRate: totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0
    };

    return ApiResponse.success(res, 'Financial analytics fetched', {
      summary,
      totals: summary,
      statusBreakdown: statusCounts,
      statusCounts,
      paymentMethodBreakdown: paymentMethodsBreakdown,
      paymentMethodsBreakdown
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ONE-CLICK EXPORT TO CSV STREAM
// GET /api/v1/analytics/export?type=leads | sales_reps | financials | deals | invoices
// ============================================================
const exportDataToCsv = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { type = 'leads' } = req.query;

    let csvContent = '';
    let filename = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;

    if (type === 'leads') {
      const leads = await Lead.find({ organizationId: orgId, isArchived: false })
        .populate('assignedTo', 'firstName lastName')
        .populate('source', 'name')
        .populate('status', 'name');

      const headers = ['First Name', 'Last Name', 'Company', 'Email', 'Phone', 'Source', 'Status', 'Score', 'Expected Value', 'Assigned Rep', 'Created Date'];
      const rows = leads.map((l) => [
        `"${l.firstName || ''}"`,
        `"${l.lastName || ''}"`,
        `"${l.company || ''}"`,
        `"${l.email || ''}"`,
        `"${l.phone || ''}"`,
        `"${l.source?.name || ''}"`,
        `"${l.status?.name || ''}"`,
        l.score || 0,
        l.expectedValue || 0,
        `"${l.assignedTo ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}` : 'Unassigned'}"`,
        `"${new Date(l.createdAt).toLocaleDateString()}"`
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (type === 'deals') {
      const deals = await Deal.find({ organizationId: orgId, isArchived: false })
        .populate('customerId', 'name companyName')
        .populate('assignedTo', 'firstName lastName');

      const headers = ['Deal Title', 'Customer', 'Deal Value', 'Status', 'Probability %', 'Expected Close', 'Owner'];
      const rows = deals.map((d) => [
        `"${d.title || ''}"`,
        `"${d.customerId?.companyName || d.customerId?.name || ''}"`,
        d.value || 0,
        `"${d.status || ''}"`,
        d.probability || 0,
        `"${d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString() : ''}"`,
        `"${d.assignedTo ? `${d.assignedTo.firstName} ${d.assignedTo.lastName}` : ''}"`
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (type === 'financials' || type === 'invoices') {
      const invoices = await Invoice.find({ organizationId: orgId, isArchived: false })
        .populate('customer', 'name companyName');

      const headers = ['Invoice Number', 'Customer', 'Grand Total', 'Paid Amount', 'Balance Due', 'Status', 'Due Date', 'Payment Terms'];
      const rows = invoices.map((inv) => [
        `"${inv.invoiceNumber || ''}"`,
        `"${inv.customer?.companyName || inv.customer?.name || ''}"`,
        inv.grandTotal || 0,
        inv.paidAmount || 0,
        inv.balanceDue || 0,
        `"${inv.status || ''}"`,
        `"${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : ''}"`,
        `"${inv.paymentTerms || ''}"`
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (type === 'sales_reps') {
      const users = await User.find({ organizationId: orgId, isActive: true }).populate('role', 'name');
      const deals = await Deal.find({ organizationId: orgId, isArchived: false, status: 'Won' });

      const headers = ['Representative', 'Email', 'Role', 'Revenue Generated'];
      const rows = users.map((u) => {
        const repWon = deals.filter((d) => d.assignedTo && d.assignedTo.toString() === u._id.toString());
        const rev = repWon.reduce((s, d) => s + (d.value || 0), 0);
        return [
          `"${u.firstName} ${u.lastName}"`,
          `"${u.email}"`,
          `"${u.role?.name || 'Sales Rep'}"`,
          rev
        ];
      });

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExecutiveDashboard,
  getLeadReports,
  getSalesRepPerformance,
  getFinancialReports,
  exportDataToCsv
};
