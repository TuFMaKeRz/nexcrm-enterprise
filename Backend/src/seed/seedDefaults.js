const mongoose = require('mongoose');
const env = require('../config/env');
const Organization = require('../models/Organization');
const Department = require('../models/Department');
const Role = require('../models/Role');
const User = require('../models/User');
const LeadSource = require('../models/LeadSource');
const LeadStatus = require('../models/LeadStatus');
const { DEFAULT_ROLE_PERMISSIONS } = require('../utils/permissions');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting Business CRM Database Seeding...');
    await mongoose.connect(env.mongodbUri);
    console.log('Connected to MongoDB.');

    // 1. Seed System Roles (organizationId: null)
    console.log('Seeding standard system roles...');
    const roleDefinitions = [
      {
        name: 'Super Admin',
        description: 'Global platform super administrator',
        permissions: DEFAULT_ROLE_PERMISSIONS['Super Admin'],
        dataScope: 'organization',
        isSystemRole: true
      },
      {
        name: 'Organization Owner',
        description: 'Complete administrative ownership of the company workspace',
        permissions: DEFAULT_ROLE_PERMISSIONS['Organization Owner'],
        dataScope: 'organization',
        isSystemRole: true
      },
      {
        name: 'Admin',
        description: 'Workspace administration and resource control',
        permissions: DEFAULT_ROLE_PERMISSIONS['Admin'],
        dataScope: 'organization',
        isSystemRole: true
      },
      {
        name: 'Sales Manager',
        description: 'Sales team supervision, pipeline management, lead assignment & deal approval',
        permissions: DEFAULT_ROLE_PERMISSIONS['Sales Manager'],
        dataScope: 'team',
        isSystemRole: true
      },
      {
        name: 'Sales Executive',
        description: 'Lead generation, follow-up management, deal closing, and customer relations',
        permissions: DEFAULT_ROLE_PERMISSIONS['Sales Executive'],
        dataScope: 'own',
        isSystemRole: true
      },
      {
        name: 'Support Executive',
        description: 'Customer service, activity tracking, and ticket management',
        permissions: DEFAULT_ROLE_PERMISSIONS['Support Executive'],
        dataScope: 'own',
        isSystemRole: true
      },
      {
        name: 'Accountant',
        description: 'Financial transactions, quotations, invoices, payments and revenue audits',
        permissions: DEFAULT_ROLE_PERMISSIONS['Accountant'],
        dataScope: 'organization',
        isSystemRole: true
      },
      {
        name: 'Viewer',
        description: 'Read-only access to CRM records and dashboards',
        permissions: DEFAULT_ROLE_PERMISSIONS['Viewer'],
        dataScope: 'own',
        isSystemRole: true
      }
    ];

    const seededRoles = {};
    for (const r of roleDefinitions) {
      let role = await Role.findOne({ organizationId: null, name: r.name });
      if (!role) {
        role = await Role.create({
          organizationId: null,
          name: r.name,
          description: r.description,
          permissions: r.permissions,
          dataScope: r.dataScope,
          isSystemRole: true
        });
      } else {
        // Ensure permissions are up to date
        role.permissions = r.permissions;
        role.dataScope = r.dataScope;
        await role.save();
      }
      seededRoles[r.name] = role;
    }
    console.log(`✅ ${Object.keys(seededRoles).length} Standard Roles synchronized.`);

    // 2. Seed Demo Tenant Organization
    console.log('Checking demo organization...');
    let demoOrg = await Organization.findOne({ slug: 'acme-global' });
    if (!demoOrg) {
      demoOrg = await Organization.create({
        name: 'Acme Global Technologies',
        slug: 'acme-global',
        industry: 'Software & IT',
        email: 'contact@acme.com',
        phone: '+91 98765 43210',
        website: 'https://acme.tech',
        address: {
          street: '100 Innovation Boulevard, Tech Park',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
          postalCode: '560100'
        },
        currency: { code: 'INR', symbol: '₹' },
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        branding: {
          primaryColor: '#4f46e5',
          secondaryColor: '#06b6d4'
        },
        subscription: {
          plan: 'business',
          status: 'active',
          maxUsers: 25,
          maxLeads: 25000,
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
      console.log('✅ Demo Organization "Acme Global Technologies" created.');
    } else {
      console.log('ℹ️ Demo Organization already exists.');
    }

    // 3. Seed Default Departments
    console.log('Seeding default departments...');
    const defaultDepts = [
      { name: 'Management', description: 'Executive leadership & strategic oversight', color: '#8b5cf6' },
      { name: 'Sales', description: 'Enterprise sales, lead qualification & deal closing', color: '#10b981' },
      { name: 'Marketing', description: 'Brand awareness, inbound campaigns & content', color: '#f59e0b' },
      { name: 'Operations', description: 'Workflow automation & business processes', color: '#3b82f6' },
      { name: 'Support', description: 'Customer service, issue escalation & client success', color: '#ec4899' },
      { name: 'Accounts', description: 'Invoicing, taxation, billing & financial audits', color: '#06b6d4' }
    ];

    const seededDepts = {};
    for (const d of defaultDepts) {
      let dept = await Department.findOne({ organizationId: demoOrg._id, name: d.name });
      if (!dept) {
        dept = await Department.create({
          organizationId: demoOrg._id,
          name: d.name,
          description: d.description,
          color: d.color
        });
        console.log(`✅ Department '${d.name}' created.`);
      }
      seededDepts[d.name] = dept;
    }

    // 4. Seed Demo Users
    const demoUsers = [
      {
        firstName: 'Bharath',
        lastName: 'Admin',
        email: 'owner@acme.com',
        password: 'Password123!',
        phone: '+91 98765 43210',
        role: seededRoles['Organization Owner']._id,
        department: 'Management'
      },
      {
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'manager@acme.com',
        password: 'Password123!',
        phone: '+91 98765 43211',
        role: seededRoles['Sales Manager']._id,
        department: 'Sales'
      },
      {
        firstName: 'Alex',
        lastName: 'Morgan',
        email: 'sales@acme.com',
        password: 'Password123!',
        phone: '+91 98765 43212',
        role: seededRoles['Sales Executive']._id,
        department: 'Sales'
      }
    ];

    for (const u of demoUsers) {
      let existingUser = await User.findOne({
        organizationId: demoOrg._id,
        email: u.email
      });

      if (!existingUser) {
        existingUser = await User.create({
          organizationId: demoOrg._id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          password: u.password,
          phone: u.phone,
          role: u.role,
          department: u.department
        });
        console.log(`✅ Demo User created: ${u.email} (${u.firstName})`);
      } else {
        console.log(`ℹ️ Demo User already exists: ${u.email}`);
      }
    }

    // Link reporting manager: Alex Morgan -> Sarah Connor
    const sarah = await User.findOne({ email: 'manager@acme.com', organizationId: demoOrg._id });
    const alex = await User.findOne({ email: 'sales@acme.com', organizationId: demoOrg._id });
    const bharath = await User.findOne({ email: 'owner@acme.com', organizationId: demoOrg._id });

    if (alex && sarah) {
      alex.reportingManager = sarah._id;
      await alex.save();
    }
    if (sarah && bharath) {
      sarah.reportingManager = bharath._id;
      await sarah.save();
    }

    // Link department heads: Management -> Bharath, Sales -> Sarah
    if (bharath) {
      await Department.updateOne(
        { organizationId: demoOrg._id, name: 'Management' },
        { head: bharath._id }
      );
    }
    if (sarah) {
      await Department.updateOne(
        { organizationId: demoOrg._id, name: 'Sales' },
        { head: sarah._id }
      );
    }

    // 5. Seed Lead Sources & Statuses for all organizations
    const allOrgs = await Organization.find({});
    const defaultSources = [
      { name: 'Website',         color: '#6366f1', isDefault: true },
      { name: 'Google Ads',      color: '#f59e0b', isDefault: true },
      { name: 'LinkedIn',        color: '#0077b5', isDefault: true },
      { name: 'WhatsApp',        color: '#25d366', isDefault: true },
      { name: 'Referral',        color: '#10b981', isDefault: true },
      { name: 'Cold Call',       color: '#ef4444', isDefault: true },
      { name: 'Trade Show',      color: '#8b5cf6', isDefault: true },
      { name: 'Facebook',        color: '#1877f2', isDefault: true },
      { name: 'Email Campaign',  color: '#06b6d4', isDefault: true }
    ];

    const defaultStatuses = [
      { name: 'New',           color: '#6366f1', order: 0, isDefault: true },
      { name: 'Contacted',     color: '#f59e0b', order: 1, isDefault: true },
      { name: 'Qualified',     color: '#3b82f6', order: 2, isDefault: true },
      { name: 'Proposal Sent', color: '#8b5cf6', order: 3, isDefault: true },
      { name: 'Negotiation',   color: '#ec4899', order: 4, isDefault: true },
      { name: 'Won',           color: '#10b981', order: 5, isDefault: true, isWon: true },
      { name: 'Lost',          color: '#ef4444', order: 6, isDefault: true, isLost: true }
    ];

    for (const org of allOrgs) {
      for (const s of defaultSources) {
        const ex = await LeadSource.findOne({ organizationId: org._id, name: s.name });
        if (!ex) {
          await LeadSource.create({ organizationId: org._id, ...s });
        }
      }
      for (const st of defaultStatuses) {
        const ex = await LeadStatus.findOne({ organizationId: org._id, name: st.name });
        if (!ex) {
          await LeadStatus.create({ organizationId: org._id, ...st });
        }
      }
    }
    console.log(`✅ Lead Sources & Statuses seeded for ${allOrgs.length} organization(s).`);

    console.log('\n======================================================');
    console.log('🎉 Business CRM Database Seeded Successfully!');
    console.log('======================================================');
    console.log('Demo Credentials for Instant Testing:');
    console.log('  1. Organization Owner:  owner@acme.com   / Password123!');
    console.log('  2. Sales Manager:       manager@acme.com / Password123!');
    console.log('  3. Sales Executive:     sales@acme.com   / Password123!');
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database Seeding Error:', error);
    process.exit(1);
  }
};

seedDatabase();
