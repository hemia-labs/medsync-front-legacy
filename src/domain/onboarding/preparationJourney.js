import { preparationPath } from './preparationGuide';

const requirementSections = {identity:'identity',profile:'doctor-identity',authorizations:'users',agenda:'agenda',consent:'documents',prescriptions:'prescriptions'};
export function journeyRequirement(branch, goal='') {
  if(branch==='users')return goal==='authorizations' ? 'authorizations' : '';
  return {identity:'identity','doctor-identity':'profile',agenda:'agenda',documents:'consent',prescriptions:'prescriptions'}[branch] || '';
}

// Only server readiness can label a requirement complete. Tutorial progress is unrelated.
export function preparationJourney(status, sections=[], currentId='', goal='') {
  if(!status || !Array.isArray(status.steps))return null;
  const allowed=new Set(sections.map(section=>section.key));
  const steps=status.steps.filter(step=>requirementSections[step.id]).map(step=>{
    const match=step.action && /^\/admin\?section=([a-z-]+)$/.exec(step.action.path);
    const section=match && match[1];
    const action=section && allowed.has(section) ? step.action : null;
    return {...step,ready:step.ready===true,action,section:section || requirementSections[step.id],
      current:step.id===currentId,path:action ? preparationPath({...step,action}) : '',blocked:!step.ready && !action};
  });
  const completed=steps.filter(step=>step.ready),pending=steps.filter(step=>!step.ready);
  const actionable=pending.filter(step=>step.action);
  const suggested=(goal==='agenda' && actionable.find(step=>step.id==='agenda')) || actionable.find(step=>step.current) || actionable[0] || null;
  let reason=suggested && suggested.detail || '';
  if(suggested && suggested.id==='authorizations')reason='Tu perfil identifica al profesional. Ahora revisa las autorizaciones para emitir recetas y firmar documentos; no se activan al guardar la identidad ni son necesarias para preparar horarios.';
  if(suggested && suggested.id==='consent')reason='Prepara el formato que usarás con tus pacientes. Es distinto de los documentos de Cuenta y legal.';
  return {steps,completed,pending,suggested,reason,blocked:pending.filter(step=>step.blocked),
    remaining:pending.filter(step=>!suggested || step.id!==suggested.id),total:steps.length};
}
