const WorkflowRule = require('../models/WorkflowRule');
const WorkflowLog = require('../models/WorkflowLog');
const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
const Customer = require('../models/Customer');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('./emailService');

// ============================================================
// RESOLVE NESTED PROPERTY FROM OBJECT
// ============================================================
const getNestedValue = (obj, path) => {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
};

// ============================================================
// EVALUATE SINGLE CONDITION
// ============================================================
const evaluateSingleCondition = (condition, data) => {
  const { field, operator, value } = condition;
  const actualValue = getNestedValue(data, field);

  switch (operator) {
    case 'equals':
      return String(actualValue).toLowerCase().trim() === String(value).toLowerCase().trim();
    case 'not_equals':
      return String(actualValue).toLowerCase().trim() !== String(value).toLowerCase().trim();
    case 'greater_than':
      return parseFloat(actualValue) > parseFloat(value);
    case 'less_than':
      return parseFloat(actualValue) < parseFloat(value);
    case 'contains':
      return String(actualValue).toLowerCase().includes(String(value).toLowerCase().trim());
    case 'in': {
      const allowed = Array.isArray(value) ? value : String(value).split(',').map((v) => v.trim().toLowerCase());
      return allowed.includes(String(actualValue).toLowerCase().trim());
    }
    case 'exists':
      return actualValue !== undefined && actualValue !== null && actualValue !== '';
    default:
      return false;
  }
};

// ============================================================
// EVALUATE CONDITION GROUP (AND / OR)
// ============================================================
const evaluateConditions = (rule, data) => {
  if (!rule.conditions || rule.conditions.length === 0) {
    return true; // No conditions = unconditionally execute
  }

  const logic = rule.conditionLogic || 'AND';
  if (logic === 'OR') {
    return rule.conditions.some((c) => evaluateSingleCondition(c, data));
  } else {
    return rule.conditions.every((c) => evaluateSingleCondition(c, data));
  }
};

// ============================================================
// EXECUTE INDIVIDUAL WORKFLOW ACTION
// ============================================================
const executeWorkflowAction = async (action, entityData, orgId, userContext) => {
  const { actionType, params = {} } = action;
  const entityId = entityData._id;

  switch (actionType) {
    case 'assign_user': {
      const targetUserId = params.userId || params.assignedTo;
      if (!targetUserId) break;

      if (entityData.schema?.paths?.expectedValue || entityData.firstName) {
        await Lead.findByIdAndUpdate(entityId, { assignedTo: targetUserId });
      } else if (entityData.schema?.paths?.value || entityData.title) {
        await Deal.findByIdAndUpdate(entityId, { assignedTo: targetUserId });
      }
      return { success: true, action: 'assign_user', targetUserId };
    }

    case 'create_task': {
      const hours = params.dueInHours || 2;
      const dueDate = new Date(Date.now() + hours * 60 * 60 * 1000);
      const isLead = Boolean(entityData.firstName);

      const task = await Task.create({
        organizationId: orgId,
        title: params.title || `Follow-up: ${entityData.firstName || entityData.title || 'CRM Record'}`,
        description: params.description || `Automated follow-up task triggered by workflow rule due in ${hours} hours.`,
        priority: params.priority || 'High',
        status: 'To Do',
        dueDate,
        assignedTo: params.assignedTo || entityData.assignedTo || userContext?._id,
        createdBy: userContext?._id || entityData.assignedTo,
        relatedTo: {
          model: isLead ? 'Lead' : 'Deal',
          id: entityId
        }
      });
      return { success: true, action: 'create_task', taskId: task._id, dueDate };
    }

    case 'send_email': {
      const recipientEmail = entityData.email || params.recipientEmail;
      if (!recipientEmail) break;

      const subject = params.subject || `Welcome ${entityData.firstName || 'from NexCRM'}`;
      let body = params.body || `<p>Hello ${entityData.firstName || 'Customer'},</p><p>Thank you for reaching out to us. Our team will connect shortly.</p>`;

      // Interpolate basic variables
      body = body
        .replace(/{{customer_name}}/g, `${entityData.firstName || ''} ${entityData.lastName || ''}`.trim())
        .replace(/{{company_name}}/g, entityData.company || entityData.companyName || 'NexCRM')
        .replace(/{{deal_title}}/g, entityData.title || '')
        .replace(/{{amount}}/g, String(entityData.value || entityData.expectedValue || ''));

      await sendEmail({
        to: recipientEmail,
        subject,
        html: body
      });
      return { success: true, action: 'send_email', recipient: recipientEmail };
    }

    case 'send_notification': {
      const targetUserId = params.userId || entityData.assignedTo || userContext?._id;
      if (!targetUserId) break;

      const notif = await Notification.create({
        organizationId: orgId,
        recipient: targetUserId,
        type: params.eventType || 'lead_assigned',
        title: params.title || 'Workflow Action Alert',
        message: params.message || `Automated alert for ${entityData.firstName || entityData.title || 'record'}`,
        entityType: entityData.firstName ? 'Lead' : 'Deal',
        entityId,
        link: entityData.firstName ? '/leads' : '/deals'
      });
      return { success: true, action: 'send_notification', notificationId: notif._id };
    }

    case 'create_customer': {
      // Auto-generate customer from Deal or Lead
      const companyName = entityData.companyName || entityData.company || entityData.title || 'New Account';
      const contactName = entityData.name || `${entityData.firstName || ''} ${entityData.lastName || ''}`.trim() || 'Primary Contact';

      let customer = await Customer.findOne({
        organizationId: orgId,
        $or: [{ companyName }, { email: entityData.email }].filter(Boolean)
      });

      if (!customer) {
        customer = await Customer.create({
          organizationId: orgId,
          companyName,
          name: contactName,
          email: entityData.email || '',
          phone: entityData.phone || '',
          industry: entityData.industry || 'General',
          accountManager: entityData.assignedTo || userContext?._id
        });
      }

      // If entity was Deal, link customerId
      if (entityData.title) {
        await Deal.findByIdAndUpdate(entityId, { customerId: customer._id });
      }

      // Notify Accounts
      const accountsUsers = await User.find({ organizationId: orgId, roleName: /Admin|Owner|Finance/i });
      if (accountsUsers.length > 0) {
        await Promise.all(
          accountsUsers.map((u) =>
            Notification.create({
              organizationId: orgId,
              recipient: u._id,
              type: 'deal_won',
              title: 'New Customer Account Created',
              message: `Customer "${companyName}" was auto-generated from Won Deal "${entityData.title}".`,
              entityType: 'Customer',
              entityId: customer._id,
              link: '/customers'
            })
          )
        );
      }

      return { success: true, action: 'create_customer', customerId: customer._id };
    }

    case 'update_field': {
      const field = params.field;
      const value = params.value;
      if (!field || value === undefined) break;

      if (entityData.firstName) {
        await Lead.findByIdAndUpdate(entityId, { [field]: value });
      } else if (entityData.title) {
        await Deal.findByIdAndUpdate(entityId, { [field]: value });
      }
      return { success: true, action: 'update_field', field, value };
    }

    default:
      return { success: false, action: actionType, reason: 'Unsupported action type' };
  }
};

// ============================================================
// MAIN EVENT-DRIVEN WORKFLOW ENGINE DISPATCHER
// ============================================================
const triggerWorkflowEngine = async (triggerEvent, entityData, orgId, userContext = null) => {
  try {
    if (!orgId || !triggerEvent || !entityData) return [];

    // Find all active rules for this tenant & trigger event
    const activeRules = await WorkflowRule.find({
      organizationId: orgId,
      trigger: triggerEvent,
      isActive: true,
      isArchived: false
    });

    if (activeRules.length === 0) return [];

    const executionResults = [];

    for (const rule of activeRules) {
      const startTime = Date.now();
      const isMatch = evaluateConditions(rule, entityData);

      if (!isMatch) {
        // Log Skipped
        await WorkflowLog.create({
          organizationId: orgId,
          ruleId: rule._id,
          ruleName: rule.name,
          trigger: triggerEvent,
          entityType: entityData.firstName ? 'Lead' : entityData.title ? 'Deal' : 'Other',
          entityId: entityData._id,
          status: 'Skipped',
          actionsExecuted: [],
          executionTimeMs: Date.now() - startTime
        });
        continue;
      }

      // Execute Action Chain
      const actionResults = [];
      const executedActionTypes = [];
      let executionError = null;

      for (const action of rule.actions) {
        try {
          const res = await executeWorkflowAction(action, entityData, orgId, userContext);
          actionResults.push(res);
          executedActionTypes.push(action.actionType);
        } catch (err) {
          executionError = err.message || String(err);
          console.error(`Error executing workflow action ${action.actionType}:`, err);
        }
      }

      const durationMs = Date.now() - startTime;

      // Update Rule statistics
      await WorkflowRule.findByIdAndUpdate(rule._id, {
        $inc: { executionCount: 1 },
        $set: { lastExecutedAt: new Date() }
      });

      // Write Log Entry
      const log = await WorkflowLog.create({
        organizationId: orgId,
        ruleId: rule._id,
        ruleName: rule.name,
        trigger: triggerEvent,
        entityType: entityData.firstName ? 'Lead' : entityData.title ? 'Deal' : 'Other',
        entityId: entityData._id,
        status: executionError ? 'Failed' : 'Success',
        actionsExecuted: executedActionTypes,
        actionResults,
        error: executionError,
        executionTimeMs: durationMs
      });

      executionResults.push(log);
    }

    return executionResults;
  } catch (error) {
    console.error('Workflow engine fatal error:', error);
    return [];
  }
};

module.exports = {
  triggerWorkflowEngine,
  evaluateConditions,
  executeWorkflowAction
};
