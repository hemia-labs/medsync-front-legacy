<template>
    <div class="mt-3 min-w-0">
        <img v-if="preview || image" :src="preview || image" alt="Logo del consultorio" class="max-w-full h-24 object-contain" @error="imageError=true">
        <p v-if="imageError" role="status" class="text-sm text-gray-600">La imagen puede haber caducado. Pulsa Actualizar imagen.</p>
        <label class="block mt-3 text-sm font-semibold" :for="inputId">Elegir logo privado</label>
        <input :id="inputId" type="file" accept="image/png,image/jpeg,image/webp" :disabled="busy" class="block mt-2 max-w-full text-sm" @change="choose">
        <p class="text-sm text-gray-500">PNG, JPEG o WebP, hasta 5 MB. Solo los usuarios autorizados pueden consultar el archivo.</p>
        <div class="flex flex-wrap gap-3 mt-3">
            <button v-if="preview" type="button" class="underline" :disabled="busy" @click="save(false)">Guardar logo</button>
            <button v-if="image" type="button" class="underline" :disabled="busy" @click="save(true)">Eliminar logo</button>
            <button type="button" class="underline" :disabled="busy" @click="refresh">Actualizar imagen</button>
            <button v-if="preview" type="button" class="underline" :disabled="busy" @click="preview=''">Cancelar selección</button>
        </div>
        <p v-if="busy" role="status">Guardando logo…</p>
        <p v-if="error" role="alert" class="mt-2 text-sm text-red-800">{{ error }}</p>
    </div>
</template>
<script>
import DABusinessService from '../../../services/core/business/DABusinessService';
import { authorizationContext, isCurrentAuthorization } from '../../../security/authorizationContext';
export default {
    props: { image: { type:String, default:'' }, businessId: {type:String, required:true} },
    data: () => ({ preview:'', busy:false, error:'', imageError:false, generation:0 }),
    computed: { accessContext() { return JSON.stringify(authorizationContext(this.$store)); }, inputId() { return 'private-clinic-logo-' + this._uid; } },
    watch: { accessContext() { this.generation++;this.preview='';this.error='';this.busy=false; }, businessId() { this.generation++; this.preview='';this.error='';this.busy=false; }, image() { this.imageError=false; } },
    beforeDestroy() { this.generation++; clearInterval(this.refreshTimer); },
    mounted() { this.refreshTimer=setInterval(()=>{if(!this.busy && !this.preview)this.refresh();},240000); },
    methods: {
        choose(event) {
            const file=event.target.files[0];event.target.value='';this.error='';
            if(!file)return;
            if(!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>5*1024*1024){this.error='Selecciona PNG, JPEG o WebP de hasta 5 MB.';return;}
            const generation=++this.generation,reader=new FileReader();
            reader.onload=()=>{if(generation===this.generation){this.preview=reader.result;this.imageError=false;}};
            reader.onerror=()=>{if(generation===this.generation)this.error='No se pudo leer la imagen.';};
            reader.readAsDataURL(file);
        },
        async refresh() {
            const context=authorizationContext(this.$store),generation=++this.generation;
            try {
                const result=await DABusinessService.getCurrent();
                if(generation!==this.generation || !isCurrentAuthorization(context,this.$store))return;
                if(!result || !result.success)throw Error();
                this.imageError=false;this.error='';this.$emit('saved',result.data);
            }catch(_){if(generation===this.generation && isCurrentAuthorization(context,this.$store))this.error='No se pudo actualizar el logo. Reintenta la consulta.';}
        },
        async save(remove) {
            if(this.busy || (!remove && !this.preview))return;
            const context=authorizationContext(this.$store),generation=++this.generation;
            this.busy=true;this.error='';
            try {
                const result=remove ? await DABusinessService.deleteLogo() : await DABusinessService.updateLogo({image:this.preview});
                if(generation!==this.generation || !isCurrentAuthorization(context,this.$store))return;
                if(!result || !result.success)throw Error();
                this.preview='';this.imageError=false;this.$emit('saved',result.data);
            }catch(_){if(generation===this.generation && isCurrentAuthorization(context,this.$store))this.error='No se pudo confirmar el cambio. Pulsa Actualizar imagen antes de volver a guardar.';}
            finally{if(generation===this.generation && isCurrentAuthorization(context,this.$store))this.busy=false;}
        }
    }
};
</script>
