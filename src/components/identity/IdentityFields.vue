<template>
  <fieldset :disabled="disabled" class="nc1-fields">
    <legend>{{ kind === 'professional' ? 'Identidad profesional' : 'Identidad del paciente' }}</legend>
    <p>Los datos no capturados permanecen pendientes. No se deducen de nombres ni de otros documentos.</p>
    <div class="nc1-grid">
      <template v-if="names">
        <label>Nombre(s)<input :value="value.givenNames" maxlength="500" @input="set('givenNames', nullable($event.target.value))"></label>
        <template v-for="(label, key) in surnames">
          <label :key="key + 'status'">{{ label }}: situación
            <select :value="value[key+'Status'] || 'unknown'" @change="surnameStatus(key, $event.target.value)"><option value="unknown">Sin capturar</option><option value="present">Tiene apellido</option><option value="absent_declared">Declara no tener</option></select>
          </label>
          <label v-if="value[key+'Status'] === 'present'" :key="key">{{ label }}<input :value="value[key]" maxlength="500" @input="set(key, nullable($event.target.value))"></label>
        </template>
        <label>Fecha de nacimiento<input type="date" :value="value.birthDate" @input="set('birthDate', nullable($event.target.value))"></label>
      </template>
      <label v-if="kind === 'patient'">Sexo biológico {{ requiredSex ? '*' : '' }}
        <select :value="value.biologicalSex || ''" :required="requiredSex" @change="set('biologicalSex', nullable($event.target.value))"><option value="">Sin capturar</option><option value="1">Hombre</option><option value="2">Mujer</option><option value="3">Intersexual</option></select>
      </label>
      <label v-for="(options, key) in enumerations" :key="key">{{ labels[key] }}<select :value="value[key] || ''" @change="set(key, nullable($event.target.value))"><option value="">Sin capturar</option><option v-for="(label, code) in options" :key="code" :value="code">{{ label }}</option></select></label>
      <label>CURP (opcional)<input :value="value.curp && value.curp.value" maxlength="18" @input="curp($event.target.value)"></label>
      <template v-if="value.curp">
        <label>Tipo de CURP<select :value="value.curp.kind" @change="set('curp', {...value.curp, kind:$event.target.value})"><option value="real">Personal</option><option value="generic">Genérica</option></select></label>
        <label v-if="value.curp.kind === 'generic'">Motivo de CURP genérica<input :value="value.curp.reason" maxlength="250" @input="set('curp', {...value.curp, reason:$event.target.value})"></label>
      </template>
    </div>
    <details v-if="!compact"><summary>Claves de nacimiento y residencia</summary><p>Captura solo claves conocidas. La validación contra catálogos está pendiente; guardar no acredita validez para un reporte.</p>
      <div class="nc1-grid"><label v-for="ref in references" :key="ref.key">{{ ref.label }}<input :value="code(ref.key)" maxlength="32" @input="setRef(ref, $event.target.value)"></label></div>
      <label v-if="kind === 'patient'">Afiliaciones: claves separadas por coma<input :value="(value.affiliations || []).map(x => x.code).join(',')" @change="setList('affiliations', 'sis.affiliation', $event.target.value)"></label>
      <label v-if="kind === 'professional' && canManage">Tipos de personal autorizados: claves separadas por coma<input :value="(value.authorizedPersonnelTypes || []).map(x => x.code).join(',')" @change="setList('authorizedPersonnelTypes', 'sis.personnel_type', $event.target.value)"></label>
    </details>
  </fieldset>
</template>
<script>
export default {
  props: { value: { type:Object,required:true },kind:{type:String,default:'patient'},names:{type:Boolean,default:true},requiredSex:Boolean,disabled:Boolean,compact:Boolean,canManage:Boolean },
  data: () => ({ surnames:{firstSurname:'Primer apellido',secondSurname:'Segundo apellido'},labels:{genderIdentity:'Género',indigenousSelfIdentification:'¿Se autodenomina indígena?',afromexicanSelfIdentification:'¿Se autodenomina afromexicano/a?',migrantStatus:'Situación migratoria'} }),
  computed:{
    enumerations() { const declaration={yes:'Sí',no:'No',declined:'No responde',unknown_to_patient:'No sabe'};return this.kind==='professional'?{}:{genderIdentity:{0:'No especificado',1:'Masculino',2:'Femenino',3:'Transgénero',4:'Transexual',5:'Travesti',6:'Intersexual',88:'Otro'},indigenousSelfIdentification:declaration,afromexicanSelfIdentification:declaration,migrantStatus:{none:'No migrante',national:'Nacional',international:'Internacional',returned:'Retornado'}}; },
    references() { const base=[{key:'birthCountry',family:'sis.country',label:'País de nacimiento: clave'}]; return this.kind==='professional'?base:base.concat([
      {key:'birthEntity',family:'sis.federal_entity',label:'Entidad de nacimiento: clave DGIS'}, {key:'nationality',family:'renapo.nationality',label:'Nacionalidad: clave RENAPO'}, {key:'originCountry',family:'sis.country',label:'País de procedencia: clave'},
      {key:'residence.country',family:'sis.country',label:'País de residencia: clave'}, {key:'residence.entity',family:'inegi.state',label:'Entidad de residencia: EE'}, {key:'residence.municipality',family:'inegi.municipality',label:'Municipio: EEMMM'}, {key:'residence.locality',family:'inegi.locality',label:'Localidad: EEMMMLLLL'}, {key:'residence.postalCode',family:'sepomex.postal_code',label:'Código postal'}]); }
  },
  methods:{ nullable(v){return v===''?null:v;},set(k,v){this.$emit('input',{...this.value,[k]:v});},surnameStatus(k,v){this.$emit('input',{...this.value,[k+'Status']:v,[k]:v==='present'?this.value[k]||null:null});},curp(v){this.set('curp',v?{value:v.toUpperCase(),kind:(this.value.curp||{}).kind||'real',...((this.value.curp||{}).reason?{reason:this.value.curp.reason}:{})}:null);},code(k){const r=k.startsWith('residence.')?(this.value.residence||{})[k.split('.')[1]]:this.value[k];return r?r.code:'';},setRef(ref,v){const r=v?{family:ref.family,code:v}:null;if(ref.key.startsWith('residence.'))this.set('residence',{...this.value.residence,[ref.key.split('.')[1]]:r});else this.set(ref.key,r);},setList(k,family,v){this.set(k,v?v.split(',').map(code=>({family,code:code.trim()})):null);} }
};
</script>
<style scoped>
.nc1-fields{border:1px solid #cbd5e1;padding:16px;margin:16px 0;min-width:0}.nc1-fields legend{font-weight:600}.nc1-fields p{font-size:14px}.nc1-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px}.nc1-fields label{display:block;font-size:14px}.nc1-fields input,.nc1-fields select{display:block;border:1px solid #64748b;border-radius:4px;padding:9px;width:100%;background:white;color:#172033;min-height:42px}.nc1-fields summary{cursor:pointer;padding:12px 0}.nc1-fields :focus{outline:2px solid #00728c;outline-offset:2px}
</style>
