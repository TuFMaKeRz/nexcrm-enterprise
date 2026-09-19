const Task = require('../models/Task');
const Activity = require('../models/Activity');
const LeadFollowUp = require('../models/LeadFollowUp');
const Deal = require('../models/Deal');
const ApiResponse = require('../utils/apiResponse');

// ============================================================
// GET UNIFIED CALENDAR EVENTS
// GET /api/v1/calendar/events
// ============================================================
const getCalendarEvents = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { start, end, assignee, type } = req.query;

    const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const endDate = end ? new Date(end) : new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);

    const promises = [];

    // 1. Fetch Tasks (by dueDate)
    if (!type || type === 'all' || type === 'task') {
      const taskFilter = {
        organizationId: orgId,
        isArchived: false,
        dueDate: { $gte: startDate, $lte: endDate }
      };
      if (assignee) taskFilter.assignedTo = assignee;

      promises.push(
        Task.find(taskFilter)
          .populate('assignedTo', 'firstName lastName avatar')
          .then((tasks) =>
            tasks.map((t) => ({
              id: `task-${t._id}`,
              rawId: t._id,
              eventType: 'task',
              title: `📌 ${t.title}`,
              start: t.dueDate,
              end: t.dueDate,
              allDay: true,
              color: t.priority === 'Urgent' ? '#ef4444' : t.priority === 'High' ? '#f59e0b' : '#3b82f6',
              status: t.status,
              priority: t.priority,
              assignedTo: t.assignedTo,
              relatedTo: t.relatedTo,
              description: t.description
            }))
          )
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    // 2. Fetch Activities (by activityDate)
    if (!type || type === 'all' || ['activity', 'meeting', 'call', 'demo', 'whatsapp'].includes(type)) {
      const actFilter = {
        organizationId: orgId,
        activityDate: { $gte: startDate, $lte: endDate }
      };
      if (assignee) actFilter.assignedTo = assignee;

      promises.push(
        Activity.find(actFilter)
          .populate('assignedTo', 'firstName lastName avatar')
          .populate('contactId', 'firstName lastName email phone')
          .then((activities) =>
            activities.map((a) => {
              let color = '#8b5cf6'; // default purple
              let icon = '🤝';
              if (a.type === 'Call') { color = '#3b82f6'; icon = '📞'; }
              else if (a.type === 'Demo') { color = '#a855f7'; icon = '💻'; }
              else if (a.type === 'Site Visit') { color = '#ec4899'; icon = '🏢'; }
              else if (a.type === 'WhatsApp') { color = '#10b981'; icon = '💬'; }

              const endDate = new Date(new Date(a.activityDate).getTime() + (a.duration || 15) * 60000);

              return {
                id: `activity-${a._id}`,
                rawId: a._id,
                eventType: a.type.toLowerCase(),
                title: `${icon} ${a.title}`,
                start: a.activityDate,
                end: endDate,
                allDay: false,
                color,
                outcome: a.outcome,
                duration: a.duration,
                location: a.location,
                assignedTo: a.assignedTo,
                contact: a.contactId,
                relatedTo: a.relatedTo,
                description: a.description
              };
            })
          )
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    // 3. Fetch Lead Follow-ups (Module 4)
    if (!type || type === 'all' || type === 'followup') {
      const fuFilter = {
        organizationId: orgId,
        scheduledAt: { $gte: startDate, $lte: endDate }
      };
      if (assignee) fuFilter.createdBy = assignee;

      promises.push(
        LeadFollowUp.find(fuFilter)
          .populate('leadId', 'firstName lastName company')
          .populate('createdBy', 'firstName lastName avatar')
          .then((followups) =>
            followups.map((f) => ({
              id: `followup-${f._id}`,
              rawId: f._id,
              eventType: 'followup',
              title: `🔔 Follow-up: ${f.leadId ? `${f.leadId.firstName} (${f.leadId.company || 'Lead'})` : f.type}`,
              start: f.scheduledAt,
              end: f.scheduledAt,
              allDay: false,
              color: '#f59e0b',
              status: f.isCompleted ? 'Completed' : 'Pending',
              assignedTo: f.createdBy,
              description: f.notes
            }))
          )
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    // 4. Fetch Deals Expected Close Dates (Module 6)
    if (!type || type === 'all' || type === 'deal') {
      const dealFilter = {
        organizationId: orgId,
        isArchived: false,
        status: 'Open',
        expectedCloseDate: { $gte: startDate, $lte: endDate }
      };
      if (assignee) dealFilter.assignedTo = assignee;

      promises.push(
        Deal.find(dealFilter)
          .populate('customerId', 'companyName')
          .populate('assignedTo', 'firstName lastName')
          .then((deals) =>
            deals.map((d) => ({
              id: `deal-${d._id}`,
              rawId: d._id,
              eventType: 'deal',
              title: `💰 Target Close: ${d.title} (₹${d.value?.toLocaleString()})`,
              start: d.expectedCloseDate,
              end: d.expectedCloseDate,
              allDay: true,
              color: '#10b981',
              status: d.status,
              value: d.value,
              customer: d.customerId?.companyName,
              assignedTo: d.assignedTo
            }))
          )
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    const [tasks, activities, followups, deals] = await Promise.all(promises);

    // Merge and sort chronologically
    const allEvents = [...tasks, ...activities, ...followups, ...deals].sort(
      (a, b) => new Date(a.start) - new Date(b.start)
    );

    return ApiResponse.success(res, 'Calendar events aggregated', allEvents);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCalendarEvents
};
