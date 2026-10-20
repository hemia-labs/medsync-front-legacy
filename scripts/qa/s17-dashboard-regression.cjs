const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const metricContext = { module: { exports: {} } };
vm.runInNewContext(read('src/domain/dashboard/metrics.js').replace(/export /g, '')
  + '\nmodule.exports = { metricNumber, formatMetric, hasMetric, sumMetric };', metricContext);
const metrics = metricContext.module.exports;
const waiting = { summary: [], trends: [], operational: [], team: [] };
const calls = [];
const defer = key => params => {
  calls.push({ key, params });
  return new Promise(resolve => waiting[key].push(resolve));
};
function component(file) {
  const source = read('src/views/Dashboard/' + file + '.vue');
  const template = compiler.parseComponent(source).template.content;
  assert.deepEqual(compiler.compile(template).errors, [], file + ' template must compile');
  const context = {
    module: { exports: {} }, ...metrics, moduleTypes: { AUTH: 'CORE/AUTH' },
    DashboardActivityTrends: {}, DashboardEnterpriseLockedWidget: {}, DashboardLockedWidget: {},
    DashboardOperationalSummary: {}, DashboardProfessionalBreakdown: {}, DashboardTeamBreakdown: {},
    buildPlanFeatureMessage: () => '', isPlanFeatureResponse: () => false,
    DABusinessDashboardService: {
      getOverview: defer('summary'), getTrends: defer('trends'), getOperationalSummary: defer('operational'), getTeamBreakdown: defer('team')
    }
  };
  vm.runInNewContext(compiler.parseComponent(source).script.content
    .replace(/^import .*;\r?\n/gm, '').replace('export default', 'module.exports ='), context);
  return context.module.exports;
}
function instance(definition, values = {}) {
  const value = { ...(definition.data ? definition.data() : {}), ...values };
  Object.entries(definition.methods || {}).forEach(([key, method]) => { value[key] = method.bind(value); });
  Object.entries(definition.computed || {}).forEach(([key, getter]) => {
    Object.defineProperty(value, key, { get: () => getter.call(value) });
  });
  return value;
}
async function run() {
  const navContext = { module: { exports: {} } };
  vm.runInNewContext(read('src/core/navigation/tenantNavigation.js').replace(/export /g, '')
    + '\nmodule.exports = tenantNavigationItems;', navContext);
  const routeContext = { module: { exports: {} } };
  vm.runInNewContext(read('src/router/routes/dashboard.js').replace('export default', 'module.exports ='), routeContext);
  const nav = navContext.module.exports.find(item => item.key === 'dashboard');
  const route = routeContext.module.exports.find(item => item.name === 'dashboard');
  ['dashboard.operations', 'dashboard.clinical', 'dashboard.financial'].forEach(permission => {
    assert.equal(nav.permissionsAny.some(code => code === permission), true, permission + ' alone enables navigation');
    assert.equal(route.meta.permissionsAny.some(code => code === permission), true, permission + ' alone enables route');
  });
  assert.equal(nav.permissionsAny.includes('dashboard.scope.all'), false, 'Scope never grants a metric family');
  assert.deepEqual([...nav.permissionsAny], [...route.meta.permissionsAny]);
  assert.equal(metrics.metricNumber(null), null);
  assert.equal(metrics.metricNumber(''), null);
  assert.equal(metrics.metricNumber(undefined), null);
  assert.equal(metrics.formatMetric(0), '0');
  assert.equal(metrics.formatMetric(null), 'No disponible');
  assert.equal(metrics.sumMetric([{ n: 3 }, { n: null }], 'n'), null, 'Unknown component cannot become zero in a total');

  const operational = component('components/DashboardOperationalSummary');
  const op = instance(operational, { data: {
    appointments: { total: 0, scheduled: 0 },
    decisionMetrics: { appointmentHealth: { completedRate: null }, retention: { retentionRate: null } },
    periodComparison: { appointmentsCreated: { current: 0, previous: 0, delta: 0, deltaPercent: null } }
  } });
  assert.equal(op.hasGroup('prescriptions'), false);
  assert.equal(op.hasMetricGroup('treatmentEconomics'), false);
  assert.equal(op.comparisonCards.length, 1);
  assert.equal(op.decisionCards.some(card => card.key === 'followUps'), false);
  assert.equal(op.decisionCards.find(card => card.key === 'retention').value, 'No disponible');
  assert.equal(op.isEmpty, false, 'Measured zeros and unavailable values must remain readable');
  const emptyOperations = () => ({
    appointments: { total: 0, scheduled: 0 }, prescriptions: { total: 0, drafts: 0 },
    clinicalHistories: { total: 0, pending: 0 },
    decisionMetrics: { appointmentHealth: { scheduled: 0, pendingConfirmation: 0, noShow: 0, cancelled: 0 },
      followUps: { available: true, due: 0, scheduled: 0, overdueWithoutAppointment: 0, upcomingWithoutAppointment: 0 } },
    periodComparison: { appointmentsCreated: { current: 0, previous: 10 } }
  });
  op.data = emptyOperations();
  assert.equal(op.hasOperationalActivity, false);
  assert.equal(op.priorityActions[0].key, 'insufficient', 'New business and empty period cannot display a green all-clear');
  assert.equal(op.priorityActions[0].tone, 'neutral');
  op.data.users = { active: 3 };
  op.data.periodComparison.patientsCreated = { current: 10 };
  assert.equal(op.priorityActions[0].key, 'insufficient', 'Accounts, patient directory and previous-period activity are not operational activity in this period');
  for (const group of ['appointments', 'prescriptions', 'clinicalHistories']) {
    op.data = emptyOperations(); op.data[group].total = 2;
    assert.equal(op.priorityActions[0].key, 'steady', group + ' has activity and measured zero pending counts');
  }
  op.data = emptyOperations(); op.data.appointments.scheduled = 1;
  assert.equal(op.priorityActions[0].key, 'steady', 'Appointments created earlier but scheduled in this period count');
  op.data = emptyOperations(); op.data.periodComparison.prescriptionsIssued = { current: 1 };
  assert.equal(op.priorityActions[0].key, 'steady', 'Prescription created earlier but issued now counts');
  op.data = { decisionMetrics: { followUps: { available: true, due: 3, scheduled: 2, overdueWithoutAppointment: 1, upcomingWithoutAppointment: 0 } } };
  assert.equal(op.priorityActions[0].key, 'overdueFollowUps');
  assert.equal(op.priorityActions[0].value, '1 sin cita', 'Subtract covered follow-ups, not the number of linked appointments');
  op.data.decisionMetrics.followUps.scheduled = 3;
  op.data.decisionMetrics.followUps.overdueWithoutAppointment = 0;
  assert.equal(op.priorityActions[0].key, 'steady', 'Follow-up-only activity is recognized');
  op.data.decisionMetrics.followUps.available = false;
  assert.equal(op.priorityActions.length, 0, 'Unavailable follow-ups cannot supply actions or an all-clear even if stale numbers exist');
  op.data = { decisionMetrics: { followUps: { available: true, due: 3, scheduled: null } } };
  assert.equal(op.pendingFollowUps, null);
  assert.equal(op.priorityActions.length, 0, 'Partial follow-up counts cannot produce a false all-clear');
  op.data = { decisionMetrics: { followUps: { available: true, due: 3, scheduled: 2 } } };
  assert.equal(op.priorityActions.length, 0, 'Older API response cannot invent overdue classification or a green message');
  op.data = { decisionMetrics: { followUps: { available: true, due: 4, scheduled: 0, overdueWithoutAppointment: 0, upcomingWithoutAppointment: 4 } } };
  assert.equal(op.priorityActions[0].key, 'steady', 'Today/future follow-ups never generate priority');
  assert.equal(op.priorityActions[0].value, 'Sin pendientes prioritarios detectados');
  assert.equal(op.decisionCards.find(card => card.key === 'followUpsUpcoming').value, '4');
  assert.equal(op.decisionCards.find(card => card.key === 'followUpsUpcoming').tone, 'neutral');
  op.data.decisionMetrics.followUps = { available: true, due: 5, scheduled: 0, overdueWithoutAppointment: 2, upcomingWithoutAppointment: 3 };
  assert.equal(op.priorityActions[0].value, '2 sin cita', 'Priority uses only overdue count, never all unbooked follow-ups');
  op.data = emptyOperations();
  Object.assign(op.data.decisionMetrics.appointmentHealth, { pendingConfirmation: 2, noShow: 4, cancelled: 7 });
  op.data.decisionMetrics.followUps = { available: true, due: 5, scheduled: 2, overdueWithoutAppointment: 3, upcomingWithoutAppointment: 0 };
  op.data.clinicalHistories.pending = 3; op.data.prescriptions.drafts = 5;
  assert.deepEqual(Array.from(op.priorityActions, item => item.key), ['cancelled', 'overdueFollowUps', 'noShow'], 'Scores sort correctly and show the top three');
  assert.deepEqual(Array.from(op.priorityActions, item => item.value), ['7 canceladas', '3 sin cita', '4 no asistio']);
  op.data = { decisionMetrics: { treatmentEconomics: {
    available: false, totalEstimatedTreatmentValue: null, averageTreatmentValuePerPatient: null,
    patientsWithEstimatedTreatment: null, treatmentItemsWithCost: null
  } } };
  assert.equal(op.economicsCards.every(card => card.value === 'No disponible'), true);
  assert.equal(op.decisionCards.length, 0);
  assert.equal(op.priorityActions.length, 0, 'Unknown metrics cannot imply that everything is stable');
  assert.equal(op.formatPercent(null), 'No disponible');
  assert.equal(op.formatPercent(0), '0%');

  const professional = instance(component('components/DashboardProfessionalBreakdown'), { data: { items: [
    { label: 'A', prescriptionsIssued: 2, clinicalHistoriesFinalized: 1, clinicalHistoriesCreated: null, documentsSigned: null },
    { label: 'B', prescriptionsIssued: 0, clinicalHistoriesFinalized: 3, clinicalHistoriesCreated: null, documentsSigned: null }
  ] } });
  assert.equal(professional.totals.documentsSigned, null);
  assert.equal(professional.totals.clinicalHistoriesFinalized, 4);
  assert.equal(professional.totalActivity(professional.items[0]), 3);
  assert.equal(professional.totalMetrics.some(metric => metric.key === 'clinicalHistoriesUpdated'), false);

  const trends = instance(component('components/DashboardActivityTrends'), { data: { series: [
    { period: '1', appointmentsCreated: 2, patientsCreated: null },
    { period: '2', appointmentsCreated: 0, patientsCreated: null }
  ] } });
  assert.equal(trends.metricDefinitions.length, 2, 'Denied clinical series remain absent');
  assert.equal(trends.metricTotals.find(metric => metric.key === 'patientsCreated').value, null);
  assert.equal(trends.metricTotals.find(metric => metric.key === 'appointmentsCreated').value, 2);
  const team = instance(component('components/DashboardTeamBreakdown'), {
    data: { license: { staffUsers: { used: 4, limit: 8 } } }
  });
  assert.equal(team.buildLicenseCard('staffUsers', 'Usuarios internos').helper, '4 disponibles', 'Team endpoint supplies used and limit, not remaining');
  team.data.license.staffUsers = { used: 10, limit: 8 };
  assert.equal(team.buildLicenseCard('staffUsers', 'Usuarios internos').remaining, 0);
  team.data.license.staffUsers = { used: 4, limit: null };
  assert.equal(team.buildLicenseCard('staffUsers', 'Usuarios internos').unlimited, true);
  team.data.license.staffUsers = { used: null, limit: 8 };
  assert.equal(team.buildLicenseCard('staffUsers', 'Usuarios internos').remaining, null, 'Unknown use cannot imply spare seats');
  assert.equal(team.buildLicenseCard('staffUsers', 'Usuarios internos').usedLabel, 'No disponible');

  const definition = component('TenantDashboard');
  const getters = {
    'CORE/AUTH/getUser': { id_login: 'doctor-a', id_business: 'tenant-a' },
    'CORE/AUTH/getBusiness': { id_business: 'tenant-a' },
    'CORE/AUTH/getPermissions': ['dashboard.tenant', 'dashboard.metrics.clinical']
  };
  const dashboard = instance(definition, { $store: { getters } });
  assert.equal(dashboard.canShowPlanStatus, false, 'Missing capabilities fail closed');
  dashboard.summary = { dashboard: { level: 'operational', planLabel: 'Profesional', capabilities: {
    planStatus: true, trends: true, operationalAnalysis: true, professionalBreakdown: false, teamBreakdown: true
  } } };
  assert.equal(dashboard.canShowTrends, true);
  assert.equal(dashboard.canShowOperationalAnalysis, true);
  assert.equal(dashboard.hasAdvancedDashboardWidgets, true, 'Profesional displays general advanced indicators');
  assert.equal(dashboard.showProLockedPanel, false, 'General indicators are not advertised as locked');
  assert.equal(dashboard.showEnterpriseLockedPanel, false, 'No team upgrade banner appears on Profesional');
  assert.equal(dashboard.planScopeNotes.find(note => note.key === 'pro-team-ready').tone, 'included');
  assert.equal(dashboard.planScopeNotes.find(note => note.key === 'enterprise-locked').title, 'Actividad por profesional');
  await dashboard.fetchProfessionalBreakdown();
  assert.equal(dashboard.canShowProfessionalBreakdown, false);
  assert.equal(calls.length, 0, 'Profesional never requests per-person breakdowns');
  assert.equal(dashboard.canShowTeamBreakdown, true);
  const teamRequest = dashboard.fetchTeamBreakdown();
  assert.equal(calls[calls.length - 1].key, 'team');
  waiting.team.shift()({ success: true, data: { users: { active: 4 }, roles: [] } });
  await teamRequest;
  assert.equal(dashboard.teamBreakdownData.users.active, 4);
  dashboard.summary = null;
  assert.equal(dashboard.planLabel, '', 'Omitted license must not become a false Sin plan badge');
  dashboard.summary = { business: { planName: 'Clinica' }, dashboard: { capabilities: { planStatus: false } } };
  assert.equal(dashboard.planLabel, '', 'Unauthorized license badge stays hidden even if metadata exists');
  dashboard.summary.dashboard.capabilities.planStatus = true;
  assert.equal(dashboard.planLabel, 'Plan Clinica');
  dashboard.summary = { activity: { prescriptionsIssued: 0, patientsCreated: null }, dashboard: { capabilities: {} } };
  assert.equal(dashboard.activityCards.length, 2);
  assert.equal(dashboard.hasMeasuredActivity, false);
  const old = dashboard.fetchSummary();
  getters['CORE/AUTH/getUser'] = { id_login: 'doctor-b', id_business: 'tenant-a' };
  definition.watch.sessionKey.call(dashboard);
  waiting.summary.shift()({ success: true, data: { private: 'previous actor' } }); await old;
  assert.equal(dashboard.summary, null);
  assert.equal(dashboard.isLoading, true);
  waiting.summary.shift()({ success: true, data: { summary: { activity: { appointmentsCreated: 4 }, dashboard: { capabilities: {} } }, widgets: {} } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(dashboard.summary.activity.appointmentsCreated, 4);
  const previous = dashboard.fetchWidget('trends', 'getTrends', 'trends');
  const newest = dashboard.fetchWidget('trends', 'getTrends', 'trends');
  const oldResolve = waiting.trends.shift();
  waiting.trends.shift()({ success: true, data: { version: 'new' } }); await newest;
  oldResolve({ success: true, data: { version: 'old' } }); await previous;
  assert.equal(dashboard.trendsData.version, 'new');
  const pending = dashboard.fetchWidget('operational', 'getOperationalSummary', 'operational_analysis');
  getters['CORE/AUTH/getPermissions'] = [];
  dashboard.clearDashboard();
  waiting.operational.shift()({ success: true, data: { private: 'revoked' } }); await pending;
  assert.equal(dashboard.operationalData, null);
  dashboard.selectedScope = 'tenant';
  const scoped = dashboard.fetchWidget('trends', 'getTrends', 'trends');
  assert.equal(calls[calls.length - 1].params.scope, 'tenant');
  definition.beforeDestroy.call(dashboard);
  waiting.trends.shift()({ success: true, data: { private: 'destroyed' } }); await scoped;
  assert.equal(dashboard.trendsData, null);
  assert.equal(dashboard.summary, null);
  console.log('PASS S17 Dashboard: Vue templates, hidden families, unknown vs zero, totals, session/permission changes, out-of-order replies, scope parameters and disposal. No DB/browser.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
