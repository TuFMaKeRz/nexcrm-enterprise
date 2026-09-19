const { z } = require('zod');
const Organization = require('../models/Organization');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../middlewares/auditLogger');

/**
 * Get current organization profile & settings
 * GET /api/v1/organization
 */
const getOrganization = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return ApiResponse.error(res, 'Organization workspace not found', 404);
    }
    return ApiResponse.success(res, 'Organization settings fetched', org);
  } catch (error) {
    next(error);
  }
};

/**
 * Update company profile, contact details, address and tax info
 * PUT /api/v1/organization/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      logo,
      industry,
      email,
      phone,
      website,
      address,
      taxInfo,
      description
    } = req.body;

    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return ApiResponse.error(res, 'Organization workspace not found', 404);
    }

    if (name) org.name = name;
    if (logo !== undefined) org.logo = logo;
    if (industry) org.industry = industry;
    if (email !== undefined) org.email = email;
    if (phone !== undefined) org.phone = phone;
    if (website !== undefined) org.website = website;
    if (description !== undefined) org.description = description;

    if (address && typeof address === 'object') {
      org.address = {
        street: address.street ?? org.address?.street ?? '',
        city: address.city ?? org.address?.city ?? '',
        state: address.state ?? org.address?.state ?? '',
        country: address.country ?? org.address?.country ?? 'India',
        postalCode: address.postalCode ?? org.address?.postalCode ?? ''
      };
    }

    if (taxInfo && typeof taxInfo === 'object') {
      org.taxInfo = {
        taxName: taxInfo.taxName ?? org.taxInfo?.taxName ?? 'GSTIN',
        taxNumber: taxInfo.taxNumber ?? org.taxInfo?.taxNumber ?? ''
      };
    }

    await org.save();

    await logAudit({
      organizationId: org._id,
      userId: req.user?._id,
      action: 'ORGANIZATION_PROFILE_UPDATED',
      entity: 'Organization',
      entityId: org._id,
      details: { updatedFields: req.body },
      req
    });

    return ApiResponse.success(res, 'Company profile updated successfully', org);
  } catch (error) {
    next(error);
  }
};

/**
 * Update localization, currency, and date formats
 * PUT /api/v1/organization/localization
 */
const updateLocalization = async (req, res, next) => {
  try {
    const { timezone, currency, dateFormat } = req.body;

    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return ApiResponse.error(res, 'Organization workspace not found', 404);
    }

    if (timezone) org.timezone = timezone;
    if (dateFormat) org.dateFormat = dateFormat;

    if (currency && typeof currency === 'object') {
      org.currency = {
        code: currency.code || org.currency?.code || 'INR',
        symbol: currency.symbol || org.currency?.symbol || '₹'
      };
    }

    await org.save();

    await logAudit({
      organizationId: org._id,
      userId: req.user?._id,
      action: 'LOCALIZATION_UPDATED',
      entity: 'Organization',
      entityId: org._id,
      details: { timezone, currency, dateFormat },
      req
    });

    return ApiResponse.success(res, 'Localization & currency settings updated successfully', org);
  } catch (error) {
    next(error);
  }
};

/**
 * Update white-label branding, primary colors, and invoice templates
 * PUT /api/v1/organization/branding
 */
const updateBranding = async (req, res, next) => {
  try {
    const {
      primaryColor,
      secondaryColor,
      bannerText,
      invoiceHeader,
      invoiceFooter,
      defaultTerms
    } = req.body;

    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return ApiResponse.error(res, 'Organization workspace not found', 404);
    }

    org.branding = {
      primaryColor: primaryColor || org.branding?.primaryColor || '#6366f1',
      secondaryColor: secondaryColor || org.branding?.secondaryColor || '#06b6d4',
      bannerText: bannerText !== undefined ? bannerText : (org.branding?.bannerText || ''),
      invoiceHeader: invoiceHeader !== undefined ? invoiceHeader : (org.branding?.invoiceHeader || 'Thank you for your business!'),
      invoiceFooter: invoiceFooter !== undefined ? invoiceFooter : (org.branding?.invoiceFooter || 'For inquiries, please contact our accounts department.'),
      defaultTerms: defaultTerms !== undefined ? defaultTerms : (org.branding?.defaultTerms || '1. Payment is due within 15 days.')
    };

    await org.save();

    await logAudit({
      organizationId: org._id,
      userId: req.user?._id,
      action: 'BRANDING_UPDATED',
      entity: 'Organization',
      entityId: org._id,
      details: { primaryColor, bannerText },
      req
    });

    return ApiResponse.success(res, 'Branding & theme settings updated successfully', org);
  } catch (error) {
    next(error);
  }
};

/**
 * Apply quick-start industry preset configuration
 * POST /api/v1/organization/preset
 */
const applyIndustryPreset = async (req, res, next) => {
  try {
    const { presetKey } = req.body;

    const presets = {
      real_estate: {
        industry: 'Real Estate',
        taxInfo: { taxName: 'GSTIN / RERA', taxNumber: '' },
        branding: { primaryColor: '#0ea5e9' } // Sky Blue
      },
      agency: {
        industry: 'Digital Marketing Agency',
        taxInfo: { taxName: 'Tax ID / GSTIN', taxNumber: '' },
        branding: { primaryColor: '#a855f7' } // Purple
      },
      software: {
        industry: 'Software & IT',
        taxInfo: { taxName: 'GSTIN / VAT', taxNumber: '' },
        branding: { primaryColor: '#6366f1' } // Indigo
      },
      education: {
        industry: 'Education & Immigration',
        taxInfo: { taxName: 'Tax ID', taxNumber: '' },
        branding: { primaryColor: '#f59e0b' } // Amber
      },
      insurance: {
        industry: 'Insurance Agency',
        taxInfo: { taxName: 'IRDAI / Tax ID', taxNumber: '' },
        branding: { primaryColor: '#10b981' } // Emerald
      },
      generic: {
        industry: 'Generic Business',
        taxInfo: { taxName: 'Tax Number', taxNumber: '' },
        branding: { primaryColor: '#6366f1' }
      }
    };

    const targetPreset = presets[presetKey] || presets.generic;

    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return ApiResponse.error(res, 'Organization workspace not found', 404);
    }

    org.industry = targetPreset.industry;
    if (targetPreset.taxInfo?.taxName) {
      org.taxInfo = { ...org.taxInfo, taxName: targetPreset.taxInfo.taxName };
    }
    if (targetPreset.branding?.primaryColor) {
      org.branding.primaryColor = targetPreset.branding.primaryColor;
    }

    await org.save();

    await logAudit({
      organizationId: org._id,
      userId: req.user?._id,
      action: 'INDUSTRY_PRESET_APPLIED',
      entity: 'Organization',
      entityId: org._id,
      details: { presetKey, industry: targetPreset.industry },
      req
    });

    return ApiResponse.success(res, `Industry preset '${targetPreset.industry}' applied successfully`, org);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrganization,
  updateProfile,
  updateLocalization,
  updateBranding,
  applyIndustryPreset
};
