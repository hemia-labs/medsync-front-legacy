<template>
    <div class="private-logo">
        <div class="private-logo__selection">
            <div class="private-logo__preview">
                <img v-if="preview || image" :src="preview || image" alt="Logo del consultorio" @error="imageError=true">
                <v-icon v-else size="28" color="inherit" aria-hidden="true">mdi-image-outline</v-icon>
            </div>
            <div class="private-logo__upload">
                <button type="button" class="private-logo__choose" :disabled="busy || processing" :aria-describedby="inputId + '-help'" @click="$refs.file.click()"><v-icon size="17" color="inherit" aria-hidden="true">mdi-upload</v-icon> {{ image || preview ? 'Cambiar imagen' : 'Elegir imagen' }}</button>
                <input ref="file" :id="inputId" type="file" accept="image/png,image/jpeg,image/webp" :disabled="busy || processing" class="sr-only" tabindex="-1" aria-label="Archivo del logo del consultorio" @change="choose">
                <p :id="inputId + '-help'" class="private-logo__help">PNG, JPEG o WebP · hasta 5 MB</p>
                <p v-if="preview" class="private-logo__ready" role="status">Imagen lista para guardar</p>
            </div>
        </div>
        <p v-if="imageError" role="status" class="private-logo__help">No pudimos mostrar el logo. Prueba con Actualizar imagen.</p>
        <div v-if="preview || image || error || uncertain" class="private-logo__actions">
            <button v-if="preview" type="button" class="private-logo__choose" :disabled="busy || processing || uncertain" @click="save(false)">{{ saveLabel }}</button>
            <button v-if="preview" type="button" :disabled="busy || processing" @click="discard">Cancelar selección</button>
            <button v-if="image && allowRemove" type="button" :disabled="busy || processing || uncertain" @click="save(true)">Eliminar logo</button>
            <button v-if="image || error || uncertain" type="button" :disabled="busy || processing" @click="refresh">Actualizar imagen</button>
        </div>
        <p v-if="busy" role="status" class="private-logo__help">Guardando logo…</p>
        <p v-if="error" role="alert" class="private-logo__error">{{ error }}</p>
    </div>
</template>
<script>
import DABusinessService from '../../../services/core/business/DABusinessService';
import { authorizationContext, isCurrentAuthorization } from '../../../security/authorizationContext';
export default {
    props: { image: { type:String, default:'' }, businessId: {type:String, required:true}, saveLabel:{type:String,default:'Guardar logo'}, allowRemove:{type:Boolean,default:true} },
    data: () => ({ preview:'', busy:false, processing:false, error:'', imageError:false, generation:0, uncertain:false }),
    computed: {
        accessContext() { return JSON.stringify(authorizationContext(this.$store)); },
        inputId() { return 'private-clinic-logo-' + this._uid; },
        editorState() { return { dirty: Boolean(this.preview) || this.uncertain, busy: this.busy || this.processing }; }
    },
    watch: {
        accessContext() { this.generation++;this.preview='';this.error='';this.busy=false;this.processing=false;this.uncertain=false; },
        businessId() { this.generation++;this.preview='';this.error='';this.busy=false;this.processing=false;this.uncertain=false; },
        image() { this.imageError=false; },
        editorState: { immediate:true, handler(state) { this.$emit('state',state); } }
    },
    beforeDestroy() { this.generation++; clearInterval(this.refreshTimer); this.$emit('state',{dirty:false,busy:false}); },
    mounted() { this.refreshTimer=setInterval(()=>{if(!this.busy && !this.processing && !this.preview)this.refresh();},240000); },
    methods: {
        discard() { if(this.busy)return; this.generation++; this.preview=''; this.processing=false; this.error=''; },
        choose(event) {
            const file=event.target.files[0];event.target.value='';this.error='';
            if(!file)return;
            if(!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>5*1024*1024){this.error='Selecciona PNG, JPEG o WebP de hasta 5 MB.';return;}
            const generation=++this.generation,reader=new FileReader();this.processing=true;
            reader.onload=()=>{if(generation===this.generation){this.preview=reader.result;this.imageError=false;this.processing=false;}};
            reader.onerror=()=>{if(generation===this.generation){this.error='No se pudo leer la imagen.';this.processing=false;}};
            reader.readAsDataURL(file);
        },
        async refresh() {
            const context=authorizationContext(this.$store),generation=++this.generation;
            try {
                const result=await DABusinessService.getCurrent();
                if(generation!==this.generation || !isCurrentAuthorization(context,this.$store))return;
                if(!result || !result.success)throw Error();
                this.imageError=false;this.error='';this.uncertain=false;this.$emit('saved',result.data);
            }catch(_){if(generation===this.generation && isCurrentAuthorization(context,this.$store))this.error='No se pudo actualizar el logo. Reintenta la consulta.';}
        },
        async save(remove) {
            if(this.busy || this.processing || this.uncertain || (!remove && !this.preview))return;
            const context=authorizationContext(this.$store),generation=++this.generation;
            this.busy=true;this.error='';this.uncertain=true;
            try {
                const result=remove ? await DABusinessService.deleteLogo() : await DABusinessService.updateLogo({image:this.preview});
                if(generation!==this.generation || !isCurrentAuthorization(context,this.$store))return;
                if(result && Number(result.status) === 403){this.uncertain=false;this.error='No tienes permiso para guardar el logo. Tu selección se conserva.';return;}
                if(!result || !result.success)throw Error();
                this.uncertain=false;this.preview='';this.imageError=false;this.$emit('saved',result.data);
            }catch(_){if(generation===this.generation && isCurrentAuthorization(context,this.$store))this.error='No se pudo confirmar el cambio. Pulsa Actualizar imagen antes de volver a guardar.';}
            finally{if(generation===this.generation && isCurrentAuthorization(context,this.$store))this.busy=false;}
        }
    }
};
</script>
<style scoped>
.private-logo { min-width: 0; margin-top: 10px; }
.private-logo__selection { display: flex; gap: 14px; align-items: center; }
.private-logo__preview { width: 66px; height: 66px; flex: 0 0 66px; display: grid; place-items: center; overflow: hidden; border: 1px dashed var(--clinic-border, #c7d7dd); border-radius: 12px; background: var(--clinic-soft, #f6f9fa); color: var(--clinic-muted, #526774); }
.private-logo__preview img { width: 100%; height: 100%; object-fit: contain; padding: 5px; }
.private-logo__upload { min-width: 0; }
.private-logo .private-logo__choose { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; min-height: 38px; border: 1px solid var(--clinic-border, #c7d7dd); border-radius: 30px; color: var(--clinic-accent, #096b78); background: var(--clinic-surface, #fff); font-size: 13px; }
.private-logo__choose:hover:not(:disabled) { background: var(--clinic-tint, #edf6f6); }
.private-logo .private-logo__help { color: var(--clinic-muted, #526774); margin-top: 6px; font-size: 12px; line-height: 1.5; }
.private-logo .private-logo__ready { margin-top: 5px; font-size: 12px; color: var(--clinic-accent, #096b78); }
.private-logo__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 12px; }
.private-logo__actions button { color: var(--clinic-accent, #096b78); font-size: 12px; min-height: 32px; }
.private-logo button:disabled { opacity: .6; }
.private-logo .private-logo__error { color: #9f1239; margin-top: 10px; font-size: 13px; }
html[data-theme="clinical-night"] .private-logo { --clinic-muted: #bdcbd6; --clinic-border: #405263; --clinic-surface: #1c2938; --clinic-soft: #172432; --clinic-accent: #7dd3fc; --clinic-tint: #1b3541; }
html[data-theme="clinical-night"] .private-logo .private-logo__error { color: #fda4af; }
</style>
