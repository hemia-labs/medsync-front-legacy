const PLAN_LABELS = {
  basic: 'Individual',
  pro: 'Profesional',
  enterprise: 'Clinica'
};

const FEATURE_MESSAGES = {
  custom_templates: 'Las plantillas clinicas personalizadas estan disponibles desde el plan Profesional.',
  advanced_documents: 'Las plantillas documentales avanzadas estan disponibles desde el plan Profesional.',
  premium_document_templates: 'Las plantillas documentales premium estan disponibles en el plan Clinica.',
  trends: 'Las tendencias del dashboard estan disponibles desde el plan Profesional.',
  operational_analysis: 'El resumen operativo del dashboard esta disponible desde el plan Profesional.',
  professional_activity_metrics: 'Las metricas por profesional estan disponibles en el plan Clinica.',
  team_usage_metrics: 'Las metricas de equipo estan disponibles desde el plan Profesional.',
  advanced_basic_reports: 'Los reportes avanzados estan disponibles en el plan Clinica.'
};

const FEATURE_PLAN_LABELS = {
  custom_templates: 'Profesional',
  advanced_documents: 'Profesional',
  premium_document_templates: 'Clinica',
  trends: 'Profesional',
  operational_analysis: 'Profesional',
  professional_activity_metrics: 'Clinica',
  team_usage_metrics: 'Profesional',
  advanced_basic_reports: 'Clinica'
};

function safeDetails(response) {
  const data = response && response.data ? response.data : {};
  return data.details || {};
}

function safeData(response) {
  return response && response.data ? response.data : {};
}

export function isLicenseLimitResponse(response) {
  const data = safeData(response);
  return data.code === 'LICENSE_LIMIT_EXCEEDED' || data.code === 'LICENSE_LIMIT_BLOCKED';
}

export function isPlanFeatureResponse(response) {
  const data = safeData(response);
  return data.code === 'PLAN_FEATURE_NOT_ALLOWED' || data.code === 'PLAN_FEATURE_BLOCKED';
}

export function getPlanLabel(planCode) {
  return PLAN_LABELS[planCode] || planCode || 'Sin plan';
}

export function getFeatureRequiredPlanLabel(feature) {
  return FEATURE_PLAN_LABELS[feature] || 'un plan superior';
}

export function buildPlanFeatureMessage(response, fallbackMessage = '') {
  const data = safeData(response);
  const details = safeDetails(response);
  const feature = data.feature || details.feature || '';
  const message = FEATURE_MESSAGES[feature];

  if(message) {
    return `${message} Contacta soporte para cambiar plan.`;
  }

  if(isPlanFeatureResponse(response)) {
    const requiredPlan = details.requiredPlan || details.required_plan;
    return `Esta funcionalidad esta disponible en ${requiredPlan ? `el plan ${getPlanLabel(requiredPlan)}` : 'un plan superior'}. Contacta soporte para cambiar plan.`;
  }

  return fallbackMessage || (response && response.message) || 'Esta funcionalidad no esta incluida en tu plan actual.';
}

export function buildLicenseLimitMessage(response, fallbackMessage = '') {
  if(isPlanFeatureResponse(response)) {
    return buildPlanFeatureMessage(response, fallbackMessage);
  }

  if(!isLicenseLimitResponse(response)) {
    return fallbackMessage || (response && response.message) || 'No fue posible completar la accion.';
  }

  const data = safeData(response);
  const details = safeDetails(response);
  const resource = data.resource || details.resource || details.legacyResource || details.legacy_resource || '';
  const recommendedPlan = details.recommendedPlan || details.recommended_plan || '';
  let message = '';

  if(resource === 'professional' || resource === 'professionals') {
    message = 'Tu plan actual ya alcanzo el limite de profesionales. Para agregar otro profesional, cambia a un plan superior o contacta soporte.';
  } else if(resource === 'staff' || resource === 'staffUsers' || resource === 'auxiliaryUsers') {
    message = 'Tu plan actual ya alcanzo el limite de usuarios internos. Para agregar mas personal, cambia a un plan superior o contacta soporte.';
  } else {
    message = 'Tu plan actual ya alcanzo el limite incluido. Para agregar mas usuarios, cambia a un plan superior o contacta soporte.';
  }

  if(recommendedPlan) {
    return `${message} Plan sugerido: ${getPlanLabel(recommendedPlan)}.`;
  }

  return message;
}

export default {
  buildPlanFeatureMessage,
  buildLicenseLimitMessage,
  getFeatureRequiredPlanLabel,
  getPlanLabel,
  isLicenseLimitResponse,
  isPlanFeatureResponse
};
