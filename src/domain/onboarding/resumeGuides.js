import { stepsFor } from './agendaGuide';
import { preparationDefinition } from './preparationGuide';

// Read only our scoped visual metadata. Never infer readiness from this storage.
export function resumableGuides(storage, context, sections, canManage=false) {
  if (!storage || !context) return [];
  const prefix=`hemia:onboarding:v1:${encodeURIComponent(context.business)}:${encodeURIComponent(context.user)}:`;
  const allowed=new Map(sections.map(section=>[section.key,section]));
  const found=[], resolvedSubjects=new Set();
  for(let i=0;i<storage.length;i++) {
    const key=storage.key(i);
    if(!key || !key.startsWith(prefix))continue;
    try {
      const [section,encodedSubject,version,stage='',goal='']=key.slice(prefix.length).split(':');
      if(!allowed.has(section) || (section!=='agenda' && (version!=='ui3' || (stage && stage!=='view'))))continue;
      const raw=storage.getItem(key);
      if(!raw || raw.length>4096)continue;
      const record=JSON.parse(raw),subject=decodeURIComponent(encodedSubject || '');
      if(record.version!==1 || !['active','paused','deferred','completed'].includes(record.state))continue;
      if(!['','agenda','authorizations','consent'].includes(goal))continue;
      const steps=section==='agenda' ? stepsFor(subject) : (preparationDefinition(section,{goal}) || {}).steps;
      if(!steps)continue;
      const index=section==='agenda' ? steps.findIndex(step=>step.id===record.step) : record.step;
      if(!Number.isInteger(index) || index<0 || index>=steps.length)continue;
      // Subject identifiers are route data only, never trusted as authorization.
      if(!/^[a-zA-Z0-9_-]{1,64}$/.test(subject))continue;
      if(['agenda','prescriptions'].includes(section) && !['own','shared','business'].includes(subject))resolvedSubjects.add(section);
      if(record.state==='completed')continue;
      const query={section,guide:'1',resume:'1'};
      if(goal)query.goal=goal;
      if(['agenda','prescriptions'].includes(section) && !['own','shared'].includes(subject))query.doctor=subject;
      let stepTitle=section==='agenda' ? steps[index].title : steps[index][1];
      if(!canManage && section==='agenda' && steps[index].id==='doctor')stepTitle='Esta es tu agenda';
      if(!canManage && section==='prescriptions' && steps[index][0]==='doctor')stepTitle='Este es tu formato de recetas';
      found.push({key,section,subject,title:allowed.get(section).title,step:index+1,total:steps.length,stepTitle,
        updatedAt:Number(record.updatedAt)||0,path:{path:'/admin',query}});
    }catch(_){/* Invalid visual metadata must not break the home screen. */}
  }
  return found.filter(item=>!(['own','shared'].includes(item.subject) && resolvedSubjects.has(item.section))).sort((a,b)=>b.updatedAt-a.updatedAt).filter((item,index,list)=>list.findIndex(other=>other.section===item.section)===index);
}
