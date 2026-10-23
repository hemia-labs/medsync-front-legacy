import { DABusinessService } from '../../../services/context/core-proccess-context';
import { agendaSteps, stepsFor, stepById, visualKey, visualRecord, readVisual } from '../../../domain/onboarding/agendaGuide';

export function createOnboardingModule(service, storageProvider) {
  // Requests and DOM never enter persisted progress. Each store owns its in-flight read.
  let inflight = null;
  const memory = new Map();
  return {
    namespaced:true,
    state:() => ({context:null, subject:'', generation:0, sequence:0, status:null, loading:false, error:'', guide:'not_started', step:'doctor', seen:[], storageFailed:false, editor:null, originAbsent:false, continuation:''}),
    mutations:{
      context(state, context) {
        if (state.context && context && state.context.key === context.key) return;
        Object.assign(state,{context, subject:'', generation:state.generation+1, sequence:state.sequence+1, status:null, loading:false, error:'', guide:'not_started', step:'doctor', seen:[], editor:null, originAbsent:false, continuation:''});
      },
      subject(state, subject) { Object.assign(state,{subject, generation:state.generation+1, sequence:state.sequence+1, status:null, error:'', loading:false, editor:null, originAbsent:false}); },
      visual(state, value) { Object.assign(state,{guide:value ? value.state : 'not_started', step:value ? value.step : 'doctor', seen:value ? value.seen : []}); },
      patch(state, value) { Object.assign(state,value); },
      editor(state, editor) { state.editor=editor; }
    },
    actions:{
      context({state,commit,dispatch}, context) {
        if ((state.context || {}).key === (context || {}).key) return;
        commit('context',context); if (context) dispatch('restore');
      },
      subject({state,commit,dispatch}, subject) {
        subject=subject || '';
        if (state.subject === subject) return;
        const active=state.guide==='active';
        commit('subject',subject); dispatch('restore');
        if (active) commit('patch',{guide:'active',step:state.guide!=='not_started' ? state.step : 'timezone'});
      },
      restore({state,commit}) {
        if (!state.context) return;
        const key=visualKey(state.context,state.subject);
        try { commit('visual',readVisual(storageProvider(),key) || memory.get(key)); }
        catch (_) { commit('patch',{storageFailed:true}); commit('visual',memory.get(key)); }
      },
      persist({state,commit}) {
        if (!state.context) return;
        const key=visualKey(state.context,state.subject),record=visualRecord({state:state.guide,step:state.step,seen:state.seen});
        memory.set(key,record);if(memory.size>64)memory.delete(memory.keys().next().value);
        try { storageProvider().setItem(key,JSON.stringify(record)); }
        catch (_) { commit('patch',{storageFailed:true}); }
      },
      async refresh({state,commit}, {force=false} = {}) {
        if (!state.context) return null;
        const generation=state.generation, key=state.context.key, subject=state.subject;
        if (!force && inflight && inflight.generation===generation && inflight.key===key) return inflight.promise;
        const sequence=state.sequence+1;
        commit('patch',{sequence,loading:true,error:''});
        const current=()=>state.generation===generation && state.sequence===sequence && (state.context || {}).key===key;
        const promise=(async()=>{
          try {
            const result=await service.getPreparation({agenda:true,doctorProfileId:subject && subject!=='business' ? subject : undefined});
            if (!current()) return null;
            if (!result || !result.success || !result.data || !result.data.agenda || !Array.isArray(result.data.steps)) throw new Error(result && result.message || 'No pudimos comprobar la agenda. Reintenta la consulta.');
            if (subject && subject!=='business' && result.data.agenda.subject!==subject) throw new Error('No pudimos comprobar la agenda seleccionada.');
            commit('patch',{status:result.data}); return result.data;
          } catch (error) { if(current()) commit('patch',{status:null,error:error.message || 'No pudimos comprobar la agenda.'}); return null; }
          finally { if(current()) commit('patch',{loading:false}); if(inflight && inflight.sequence===sequence && inflight.generation===generation) inflight=null; }
        })();
        inflight={generation,key,sequence,promise};return promise;
      },
      async begin({state,commit,dispatch}, {resume=false} = {}) {
        commit('patch',{guide:'active',continuation:'',step:resume ? stepById(state.step).id : state.subject ? stepsFor(state.subject)[0].id : agendaSteps[0].id});
        dispatch('persist'); return dispatch('refresh');
      },
      pause({commit,dispatch}, value='paused') { commit('patch',{guide:value}); dispatch('persist'); },
      move({state,commit,dispatch}, direction) {
        const steps=stepsFor(state.subject), index=steps.findIndex(step=>step.id===state.step);
        const next=Math.max(0,Math.min(steps.length-1,index+direction));
        commit('patch',{step:steps[next].id,seen:[...new Set([...state.seen,state.step])]});dispatch('persist');
        if (steps[next].id==='verify') dispatch('refresh',{force:true});
      },
      async saved({state,commit,dispatch}, event) {
        const editor=state.editor;
        if (!editor || !event || editor.instanceId!==event.instanceId || editor.requestSequence!==event.requestSequence || editor.subject!==event.subject || editor.contextKey!==event.contextKey || state.context.key!==event.contextKey) return;
        if (event.kind==='schedule' && state.guide==='active') {commit('patch',{step:'verify'});dispatch('persist');}
        return dispatch('refresh',{force:true});
      },
      detach({state,commit}, instanceId) { if(state.editor && state.editor.instanceId===instanceId) commit('editor',null); }
    }
  };
}
export default createOnboardingModule(DABusinessService, () => window.localStorage);
