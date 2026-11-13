<template>
    <v-dialog v-model="internalShow" persistent :retain-focus="!leaveDialogOpen" :fullscreen="$vuetify.breakpoint.xsOnly" max-width="1100" content-class="rx-sheet-dialog">
        <v-card v-dialog-name="{ id: `${uid}-title` }" class="rx-sheet" @keydown="trapFocus">
            <header class="rx-sheet-header">
                <div>
                    <p class="rx-eyebrow">Receta médica · {{ step === 'review' ? 'Revisión' : 'Borrador' }}</p>
                    <h2 :id="`${uid}-title`" tabindex="-1">{{ step === 'review' ? 'Revisar antes de emitir' : form.id_prescription ? 'Editar borrador' : 'Nueva receta' }}</h2>
                    <p>{{ patientName }} <span v-if="patientMeta">· {{ patientMeta }}</span></p>
                </div>
                <v-btn icon :disabled="busy" aria-label="Cerrar hoja de receta" @click="close"><v-icon>mdi-close</v-icon></v-btn>
            </header>
            <div ref="body" class="rx-sheet-body">
                <p v-if="loading" role="status">Cargando paciente, doctor y receta…</p>
                <div v-else-if="loadError" class="rx-message rx-message--error" role="alert">
                    <p>{{ loadError }}</p><button class="rx-button" @click="loadContext">Reintentar carga</button>
                </div>
                <template v-else>
                    <div class="rx-allergies" :class="{ 'rx-allergies--warning': allergyState !== 'none' }">
                        <div><strong>{{ allergyTitle }}</strong><p v-if="allergyDescription">{{ allergyDescription }}</p></div>
                        <div class="rx-context-actions">
                            <a :href="`/px/history/${form.id_person}`" target="_blank" rel="noopener">Revisar expediente <span class="sr-only">(abre otra pestaña)</span></a>
                            <button :disabled="busy || refreshingContext" @click="refreshPatient">{{ refreshingContext ? 'Actualizando…' : 'Actualizar datos' }}</button>
                        </div>
                    </div>
                    <div v-if="contextError" class="rx-message rx-message--error" role="alert">{{ contextError }}</div>
                    <div v-if="errors.length || error" ref="errorSummary" class="rx-message rx-message--error" tabindex="-1" role="alert">
                        <strong>{{ error || 'Revisa los siguientes datos para continuar:' }}</strong>
                        <ul v-if="errors.length"><li v-for="entry in errors" :key="entry.code || entry.key"><a v-if="entry.href" :href="entry.href" target="_blank" rel="noopener">{{ entry.message }} <span class="sr-only">(abre otra pestaña)</span></a><button v-else @click="focusField(entry.key)">{{ entry.message }}</button></li></ul>
                    </div>
                    <p v-if="savedMessage" class="rx-message" role="status">{{ savedMessage }}</p>
                    <section v-if="step === 'edit'" class="rx-paper" aria-label="Captura de receta">
                        <div class="rx-metadata">
                            <v-select v-field-error="{ id: fieldId('doctor'), invalid: !!fieldErrors('doctor').length }" :id="fieldId('doctor')" v-model="form.issuer_doctor_id" :items="doctorOptions" item-text="display_name" item-value="id_login" label="Doctor emisor *" :disabled="currentUserIsDoctor || busy" :error-messages="fieldErrors('doctor')" outlined dense hide-details="auto"></v-select>
                            <v-text-field v-field-error="{ id: fieldId('date'), invalid: !!fieldErrors('date').length }" :id="fieldId('date')" v-model="form.issue_date" label="Fecha de receta *" type="date" :disabled="busy" :error-messages="fieldErrors('date')" outlined dense hide-details="auto"></v-text-field>
                        </div>
                        <div v-if="selectedDoctorWarning || !doctors.length" class="rx-message rx-message--warning" role="status">
                            <p>{{ selectedDoctorWarning || 'Aún no hay doctores disponibles. Primero prepara el perfil profesional de un doctor del consultorio.' }}</p>
                            <p v-if="selectedDoctor && !selectedDoctorIsMe && doctorIdentityIncomplete">Pide al doctor seleccionado que complete Mi perfil profesional con su propia cuenta.</p>
                            <p v-if="doctorAuthorizationMissing && !canManageUsers">Solicita a la administración del consultorio la autorización como doctor emisor.</p>
                            <div class="rx-context-actions">
                                <a v-if="canOpenOwnProfile && (!selectedDoctor || selectedDoctorIsMe) && (!doctors.length || doctorIdentityIncomplete)" href="/admin?section=doctor-identity" target="_blank" rel="noopener">Completar mi perfil profesional <span class="sr-only">(abre otra pestaña)</span></a>
                                <a v-if="canManageUsers && (!doctors.length || doctorAuthorizationMissing || !selectedDoctorIsMe)" href="/admin?section=users" target="_blank" rel="noopener">Revisar doctores y autorizaciones <span class="sr-only">(abre otra pestaña)</span></a>
                                <button type="button" :disabled="busy || refreshingDoctors" @click="refreshDoctors">{{ refreshingDoctors ? 'Actualizando…' : 'Actualizar doctores sin perder la receta' }}</button>
                            </div>
                            <p>La configuración se abre en otra pestaña. Vuelve aquí y actualiza los doctores; tu captura se conserva.</p>
                        </div>
                        <div class="rx-prescription-heading"><div><h3>Prescripción</h3><p>* Obligatorio para emitir. Puedes guardar un borrador incompleto.</p></div><span class="rx-symbol" aria-hidden="true">℞</span></div>
                        <article v-for="(item, index) in form.items" :key="item.local_id" class="rx-medication">
                            <div class="rx-medication-heading"><h4>Medicamento {{ index + 1 }}</h4><v-btn icon :disabled="busy || form.items.length === 1" :aria-label="`Quitar medicamento ${index + 1}`" @click="removeItem(index)"><v-icon>mdi-delete-outline</v-icon></v-btn></div>
                            <div class="rx-core-fields">
                                <v-text-field v-for="field in coreFields" :key="field.key" v-field-error="{ id: fieldId(`${index}-${field.key}`), invalid: !!fieldErrors(`${index}-${field.key}`).length }" :id="fieldId(`${index}-${field.key}`)" v-model="item[field.key]" :label="`${field.label} *`" :class="{ 'rx-drug-name': field.key === 'generic_name' }" :disabled="busy" :error-messages="fieldErrors(`${index}-${field.key}`)" outlined dense hide-details="auto"></v-text-field>
                            </div>
                            <v-textarea :id="fieldId(`${index}-indications`)" v-model="item.indications" label="Indicaciones para el paciente (opcionales)" placeholder="Escribe las instrucciones adicionales con tus propias palabras." :disabled="busy" rows="2" auto-grow outlined hide-details="auto" class="rx-indications"></v-textarea>
                            <button class="rx-details-toggle" :aria-expanded="String(item.detailsOpen)" :aria-controls="`${uid}-details-${item.local_id}`" :disabled="busy" @click="item.detailsOpen = !item.detailsOpen"><v-icon small>{{ item.detailsOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>{{ item.detailsOpen ? 'Ocultar detalles' : 'Agregar presentación, concentración y otros detalles' }}</button>
                            <div v-if="item.detailsOpen" :id="`${uid}-details-${item.local_id}`" class="rx-details-fields"><v-text-field v-for="field in detailFields" :key="field.key" v-model="item[field.key]" :label="`${field.label} (opcional)`" :disabled="busy" outlined dense hide-details="auto"></v-text-field></div>
                        </article>
                        <div v-if="removedItem" class="rx-message rx-undo" role="status"><span>Medicamento retirado de la hoja.</span><button @click="undoRemove" :disabled="busy">Deshacer</button></div>
                        <button class="rx-button rx-add" :disabled="busy" @click="addItem"><v-icon small>mdi-plus</v-icon>Agregar medicamento</button>
                        <details class="rx-general"><summary>Diagnóstico y notas generales (opcionales)</summary><v-text-field v-model="form.diagnosis" label="Diagnóstico" :disabled="busy" outlined dense hide-details="auto"></v-text-field><v-textarea v-model="form.notes" label="Notas generales" :disabled="busy" rows="2" auto-grow outlined hide-details="auto"></v-textarea></details>
                    </section>
                    <section v-else class="rx-paper rx-review" aria-label="Revisión de receta">
                        <div class="rx-review-meta"><div><h3>{{ selectedDoctor ? selectedDoctor.display_name : '' }}</h3><p v-if="selectedDoctor">Cédula: {{ selectedDoctor.professional_license || 'Sin registrar' }}</p></div><p>{{ form.issue_date }}</p></div>
                        <p><strong>Paciente:</strong> {{ patientName }} <span v-if="patientMeta">· {{ patientMeta }}</span></p>
                        <p v-if="form.diagnosis"><strong>Diagnóstico:</strong> {{ form.diagnosis }}</p>
                        <article v-for="(item, index) in form.items" :key="item.local_id" class="rx-review-item"><h4>{{ index + 1 }}. {{ item.generic_name }}</h4><p>{{ item.dose }} · {{ item.administration_route }} · {{ item.frequency }} · {{ item.duration }}</p><p v-for="field in filledDetails(item)" :key="field.key">{{ field.label }}: {{ item[field.key] }}</p><p v-if="item.indications" class="rx-free-text"><strong>Indicaciones:</strong> {{ item.indications }}</p></article>
                        <p v-if="form.notes" class="rx-free-text"><strong>Notas generales:</strong> {{ form.notes }}</p>
                        <div class="rx-message rx-message--warning">Al emitir, esta receta quedará bloqueada como documento histórico. Para corregir una receta emitida tendrás que cancelarla y crear otra.</div>
                    </section>
                </template>
            </div>
            <footer class="rx-sheet-footer">
                <p>{{ busy ? (issuing ? 'Emitiendo receta…' : 'Guardando borrador…') : 'El borrador se guarda al pulsar Guardar.' }}</p>
                <div class="rx-footer-actions">
                    <button class="rx-button" :disabled="busy" @click="step === 'review' ? backToEdit() : close()">{{ step === 'review' ? 'Volver a editar' : 'Cerrar' }}</button>
                    <button class="rx-button" :disabled="busy || loading || !!loadError" @click="saveDraft()">Guardar borrador</button>
                    <button v-if="canIssue" class="rx-button rx-button--primary" :disabled="busy || loading || !!loadError" @click="step === 'review' ? issue() : review()">{{ step === 'review' ? 'Confirmar emisión' : 'Revisar y emitir' }}</button>
                </div>
            </footer>
        </v-card>
    </v-dialog>
</template>
<script>
import { mapGetters } from 'vuex';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { DAPrescriptionService, DAPxService } from '../../../services/context/core-proccess-context';
import { coreFields, detailFields, emptyItem, emptyForm, payload, snapshot, validate, saveAndIssue } from '../../../domain/prescriptions/prescription.editor';
import dialogName from '../../../core/directives/dialog-name';
import fieldError from '../../../core/directives/field-error';
import { uuid } from 'vue-uuid';
import { getSettingsSections } from '../../../security/settingsAccess';
export default {
    directives: { dialogName, fieldError },
    props: { show: { type: Boolean, default: false }, px: { type: Object, default: () => ({}) }, prescription: { type: Object, default: null } },
    data() {
        return { internalShow: false, form: emptyForm(''), patientContext: {}, doctors: [], coreFields, detailFields,
            error: '', errors: [], loading: false, loadError: '', saving: false, issuing: false, refreshingContext: false,
            contextError: '', baseline: '', step: 'edit', removedItem: null, savedMessage: '', request: 0, leaveDialogOpen: false, refreshingDoctors: false };
    },
    computed: {
        ...mapGetters(moduleTypes.AUTH, { authUser: fnTypes.getUser, authRole: fnTypes.getRole, hasPermission: fnTypes.hasPermission }),
        uid() { return `rx-editor-${this._uid}`; },
        busy() { return this.saving || this.issuing; },
        dirty() { return this.internalShow && !this.loading && !!this.baseline && snapshot(this.form) !== this.baseline; },
        patient() { return this.patientContext.person || {}; },
        patientName() { return this.patient.fullname || `${this.patient.name || ''} ${this.patient.surname || ''}`.trim() || 'Cargando paciente'; },
        patientMeta() { return [this.patient.age == null ? '' : `${this.patient.age} años`, this.patient.number ? `Exp. ${this.patient.number}` : ''].filter(Boolean).join(' · '); },
        currentUserIsDoctor() { return (typeof this.authRole === 'object' ? this.authRole && this.authRole.code : this.authRole) === 'doctor' || (this.authUser && this.authUser.rol === 'doctor'); },
        canIssue() { return this.hasPermission('prescriptions.issue'); },
        doctorOptions() { return this.doctors.map(doctor => ({ ...doctor, display_name: doctor.professional_name || doctor.name })); },
        selectedDoctor() { return this.doctorOptions.find(doctor => doctor.id_login === this.form.issuer_doctor_id); },
        settingsSections() { const role = typeof this.authRole === 'object' ? this.authRole && this.authRole.code : this.authRole; return getSettingsSections(role || this.authUser && this.authUser.rol, this.hasPermission); },
        canOpenOwnProfile() { return this.settingsSections.some(section => section.key === 'doctor-identity'); },
        canManageUsers() { return this.settingsSections.some(section => section.key === 'users'); },
        selectedDoctorIsMe() { return this.selectedDoctor && this.authUser && this.selectedDoctor.id_login === this.authUser.id_login; },
        doctorIdentityIncomplete() { const doctor = this.selectedDoctor; return Boolean(doctor && (!doctor.id_doctor_professional_profile || Number(doctor.professional_profile_active) !== 1 || !doctor.professional_name || !doctor.professional_license || !doctor.signature_image)); },
        doctorAuthorizationMissing() { return Boolean(this.selectedDoctor && Number(this.selectedDoctor.can_issue_prescriptions) !== 1); },
        selectedDoctorWarning() {
            return [this.doctorIdentityIncomplete ? 'Para emitir, el doctor necesita un perfil activo con nombre profesional, cédula y firma en Configuración > Mi perfil profesional.' : '', this.doctorAuthorizationMissing ? 'La administración debe autorizar al doctor como emisor en Configuración > Personal y usuarios; completar el perfil no concede esa autorización.' : '', this.doctorIdentityIncomplete || this.doctorAuthorizationMissing ? 'Puedes guardar un borrador mientras completas la preparación.' : ''].filter(Boolean).join(' ');
        },
        allergyState() { const allergy = this.patientContext.allergy || {}; return !allergy.id_allergy || allergy.has_allergy == null ? 'unknown' : Number(allergy.has_allergy) === 1 ? 'registered' : 'none'; },
        allergyTitle() { return { unknown: 'Alergias sin confirmar: consulta al paciente antes de continuar.', registered: 'Alergias registradas', none: 'Sin alergias registradas' }[this.allergyState]; },
        allergyDescription() { const allergy = this.patientContext.allergy || {}; return this.allergyState === 'registered' ? (allergy.description || allergy.allergy || 'Revisa el detalle en el expediente.') : ''; }
    },
    watch: {
        show: { immediate: true, handler(value) { this.internalShow = value; if (value) this.init(); } },
        internalShow(value) { if (!value) { this.request += 1; this.$emit('close'); } }
    },
    mounted() {
        window.addEventListener('beforeunload', this.beforeUnload);
        this.removeNavigationGuard = this.$router.beforeEach((to, from, next) => {
            this.confirmLeave().then(allowed => next(allowed)).catch(() => next(false));
        });
    },
    beforeDestroy() {
        this.request += 1;
        window.removeEventListener('beforeunload', this.beforeUnload);
        if(this.removeNavigationGuard) this.removeNavigationGuard();
    },
    methods: {
        init() {
            this.step = 'edit'; this.error = ''; this.errors = []; this.savedMessage = ''; this.removedItem = null; this.baseline = ''; this.contextError = '';
            this.form = emptyForm(this.px.person && this.px.person.id_person || '', uuid.v4()); this.patientContext = {}; this.loadContext();
        },
        async loadContext() {
            const request = ++this.request; this.loading = true; this.loadError = '';
            try {
                const [patient, doctors, draft] = await Promise.all([
                    DAPxService.getById(this.form.id_person), DAPrescriptionService.doctors(),
                    this.prescription ? DAPrescriptionService.getById(this.prescription.id_prescription) : Promise.resolve(null)
                ]);
                if (request !== this.request) return;
                if (!patient.success || !patient.data || !patient.data.person || patient.data.person.id_person !== this.form.id_person) throw new Error('No se pudo cargar el paciente seleccionado. Reintenta antes de capturar la receta.');
                if (!doctors.success) throw new Error(doctors.message || 'No se pudieron cargar los doctores.');
                if (draft && (!draft.success || draft.data.status !== 'draft' || draft.data.id_person !== this.form.id_person)) throw new Error('No se pudo abrir este borrador. Consulta su estado en el historial.');
                this.patientContext = patient.data; this.doctors = doctors.data || [];
                if (draft) this.form = { ...emptyForm(draft.data.id_person), ...draft.data, issue_date: String(draft.data.issue_date || '').slice(0, 10), items: (draft.data.items || []).map(emptyItem) };
                else if (this.currentUserIsDoctor && this.authUser) this.form.issuer_doctor_id = this.authUser.id_login;
                else if (this.doctors.length === 1) this.form.issuer_doctor_id = this.doctors[0].id_login;
                this.baseline = snapshot(this.form);
            } catch (error) { if (request === this.request) this.loadError = error.message || 'No se pudo cargar la hoja.'; }
            finally { if (request === this.request) this.loading = false; }
        },
        async refreshPatient() {
            this.refreshingContext = true; this.contextError = '';
            try {
                const response = await DAPxService.getById(this.form.id_person);
                if (!response.success || !response.data.person || response.data.person.id_person !== this.form.id_person) throw new Error('No se pudo actualizar el expediente. Los datos capturados en la receta se conservaron.');
                this.patientContext = response.data;
            } catch (error) { this.contextError = error.message; }
            finally { this.refreshingContext = false; }
        },
        async refreshDoctors() {
            if(this.refreshingDoctors || this.busy) return;
            const request = this.request;
            this.refreshingDoctors = true; this.contextError = '';
            try {
                const response = await DAPrescriptionService.doctors();
                if(request !== this.request) return;
                if(!response.success) throw new Error(response.message || 'No se pudieron actualizar los doctores. Tu receta se conservó; reintenta.');
                this.doctors = response.data || [];
                this.errors = this.errors.filter(entry => entry.code !== 'doctor-profile' && entry.code !== 'doctor-authorization');
            } catch(error) { if(request === this.request) this.contextError = error.message || 'No se pudieron actualizar los doctores. Tu receta se conservó; reintenta.'; }
            finally { this.refreshingDoctors = false; }
        },
        fieldId(key) { return `${this.uid}-${key}`; },
        fieldErrors(key) { return this.errors.filter(entry => entry.key === key).map(entry => entry.message); },
        focusField(key) { this.$nextTick(() => { const field = document.getElementById(this.fieldId(key)); if (field) { field.focus(); field.scrollIntoView({ block: 'center' }); } }); },
        async showErrors() { await this.$nextTick(); if (this.$refs.errorSummary) this.$refs.errorSummary.focus(); },
        check(forIssue) {
            this.error = ''; this.errors = validate(this.form, forIssue);
            if (this.currentUserIsDoctor && this.form.issuer_doctor_id !== this.authUser.id_login) this.errors.push({ key: 'doctor', message: 'Solo puedes emitir con tu propio perfil profesional.' });
            if (forIssue && this.doctorIdentityIncomplete) this.errors.push({ key: 'doctor', code: 'doctor-profile', message: this.selectedDoctorIsMe ? 'Completa tu identidad y firma en Mi perfil profesional; después actualiza los doctores de esta receta.' : 'El doctor seleccionado debe completar su perfil profesional y firma; después actualiza los doctores.', href: this.selectedDoctorIsMe && this.canOpenOwnProfile ? '/admin?section=doctor-identity' : undefined });
            if (forIssue && this.doctorAuthorizationMissing) this.errors.push({ key: 'doctor', code: 'doctor-authorization', message: this.canManageUsers ? 'Revisa la autorización como doctor emisor en Personal y usuarios; después actualiza los doctores de esta receta.' : 'Solicita a la administración que autorice al doctor seleccionado como emisor.', href: this.canManageUsers ? '/admin?section=users' : undefined });
            if (this.errors.length) { this.step = 'edit'; this.showErrors(); return false; }
            return true;
        },
        addItem() { this.form.items.push(emptyItem()); this.focusField(`${this.form.items.length - 1}-generic_name`); },
        removeItem(index) { this.removedItem = { item: this.form.items[index], index }; this.form.items.splice(index, 1); this.errors = []; },
        undoRemove() { this.form.items.splice(this.removedItem.index, 0, this.removedItem.item); this.removedItem = null; this.errors = []; },
        filledDetails(item) { return detailFields.filter(field => item[field.key]); },
        backToEdit() { this.step = 'edit'; this.error = ''; },
        review() { if (this.check(true)) { this.step = 'review'; this.$nextTick(() => { this.$refs.body.scrollTop = 0; document.getElementById(`${this.uid}-title`).focus(); }); } },
        async saveDraft(closeAfter = true) {
            if (this.busy || this.loading || this.loadError || !this.check(false)) return false;
            this.saving = true;
            try {
                const response = await DAPrescriptionService.save(payload(this.form));
                if (!response.success) throw new Error(response.message || 'No se pudo guardar. Tus cambios siguen en la hoja; reintenta.');
                this.form.id_prescription = response.data.id_prescription; this.baseline = snapshot(this.form); this.$emit('saved', response.data);
                if (closeAfter || response.data.status === 'issued') this.internalShow = false;
                return true;
            } catch (error) { this.error = error.message; this.showErrors(); return false; }
            finally { this.saving = false; }
        },
        async issue() {
            if (this.busy || this.step !== 'review' || !this.check(true)) return;
            this.issuing = true;
            try {
                const response = await saveAndIssue(DAPrescriptionService, this.form, draft => { this.baseline = snapshot(this.form); this.savedMessage = `Borrador ${draft.folio || ''} guardado.`; this.$emit('draft-saved', draft); });
                if (!response.success) throw new Error(response.message || 'No se pudo confirmar la emisión. Reintenta sobre esta misma receta.');
                this.baseline = snapshot(this.form); this.$emit('saved', response.data); this.internalShow = false;
            } catch (error) { this.error = error.message; this.showErrors(); }
            finally { this.issuing = false; }
        },
        async confirmLeave() {
            if (!this.internalShow) return true;
            if (this.busy) return false;
            if (!this.dirty) return true;
            this.leaveDialogOpen = true;
            await this.$nextTick();
            let result;
            try {
                result = await this.$swal({
                    title: 'Tienes cambios sin guardar',
                    text: 'Puedes guardar el borrador antes de salir.',
                    showDenyButton: true,
                    showCancelButton: true,
                    confirmButtonText: 'Guardar y salir',
                    denyButtonText: 'Descartar cambios',
                    cancelButtonText: 'Seguir editando',
                    customClass: { popup: 'medsync-alert-wide' },
                    focusCancel: true
                });
            }
            finally { this.leaveDialogOpen = false; }
            if (result.isConfirmed) return this.saveDraft(false);
            return result.isDenied;
        },
        async close() { if (await this.confirmLeave()) this.internalShow = false; },
        trapFocus(event) {
            if(event.key !== 'Tab' || this.leaveDialogOpen) return;
            const controls = [...event.currentTarget.querySelectorAll('button, a[href], input, textarea, select, summary, [tabindex]')]
                .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
            if(!controls.length) return;
            const first = controls[0], last = controls[controls.length - 1];
            if(event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if(!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        },
        beforeUnload(event) { if (this.dirty || this.busy) { event.preventDefault(); event.returnValue = ''; } }
    }
};
</script>
<style scoped>
.rx-sheet { display: flex; flex-direction: column; max-height: calc(100vh - 80px); color: #334155; }
.rx-sheet-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 24px; border-bottom: 1px solid #dbe5e9; background: #f1fafb; gap: 12px; flex-shrink: 0; }
.rx-sheet h2 { font-size: 22px; line-height: 1.3; margin: 3px 0; color: #1e293b; }
.rx-sheet h3 { font-size: 18px; color: #1e293b; }
.rx-sheet h4 { font-size: 15px; color: #334155; }
.rx-sheet p { margin: 0; }
.rx-sheet-header p { font-size: 14px; }
.rx-eyebrow { color: #116c70; font-size: 11px !important; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.rx-sheet-body { overflow-y: auto; padding: 20px 24px; flex: 1 1 auto; min-height: 0; background: #f4f7f8; }
.rx-paper { padding: 22px; background: white; border: 1px solid #dbe5e9; border-radius: 8px; }
.rx-metadata { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; }
.rx-prescription-heading { display: flex; align-items: center; justify-content: space-between; margin: 20px 0 8px; }
.rx-prescription-heading p { font-size: 12px; margin-top: 4px; }
.rx-symbol { font-size: 32px; color: #116c70; }
.rx-medication { border-top: 1px solid #dbe5e9; padding: 8px 0 18px; }
.rx-medication-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.rx-core-fields { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.rx-drug-name { grid-column: 1 / -1; }
.rx-indications { margin-top: 12px; }
.rx-details-toggle { color: #116c70; display: flex; align-items: center; min-height: 44px; text-align: left; font-size: 13px; gap: 4px; }
.rx-details-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 8px; }
.rx-general { border-top: 1px solid #dbe5e9; margin-top: 18px; padding-top: 10px; }
.rx-general summary { cursor: pointer; min-height: 44px; padding: 10px 0; font-size: 14px; }
.rx-general .v-input { margin: 10px 0; }
.rx-sheet-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-shrink: 0; padding: 14px 24px; background: white; border-top: 1px solid #dbe5e9; }
.rx-sheet-footer > p { font-size: 12px; max-width: 180px; }
.rx-footer-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.rx-button { display: inline-flex; justify-content: center; align-items: center; gap: 6px; min-height: 44px; padding: 9px 14px; border-radius: 8px; border: 1px solid #b8cbd0; background: white; color: #116c70; font-weight: 600; font-size: 14px; }
.rx-button--primary { background: #116c70; color: white; border-color: #116c70; }
.rx-button:disabled { opacity: .55; cursor: not-allowed; }
.rx-button .v-icon { color: inherit; }
.rx-button:focus-visible, .rx-sheet button:focus-visible, .rx-sheet a:focus-visible, .rx-general summary:focus-visible { outline: 3px solid #176ea6; outline-offset: 2px; }
.rx-allergies { padding: 12px 14px; background: #eaf6ef; border: 1px solid #b7dbca; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
.rx-allergies--warning { background: #fff9e8; border-color: #e7ca78; color: #674600; }
.rx-context-actions { display: flex; flex-wrap: wrap; gap: 10px; flex-shrink: 0; }
.rx-context-actions a, .rx-context-actions button { display: inline-flex; align-items: center; min-height: 36px; text-decoration: underline; color: #116c70; }
.rx-message { padding: 12px 14px; background: #edf7fa; border: 1px solid #b8d6df; border-radius: 6px; margin-bottom: 16px; font-size: 14px; }
.rx-message--error { color: #991b1b; background: #fff1f2; border-color: #fecdd3; }
.rx-message--error ul { margin: 8px 0 0; padding-left: 20px; }
.rx-message--error li button { text-decoration: underline; text-align: left; padding: 4px 0; }
.rx-message--error li a { display: inline-block; color: inherit; text-decoration: underline; padding: 4px 0; }
.rx-message--warning { color: #674600; background: #fff9e8; border-color: #e7ca78; margin-top: 16px; }
.rx-undo { display: flex; justify-content: space-between; align-items: center; }
.rx-undo button { text-decoration: underline; padding: 10px; }
.rx-review-meta { display: flex; justify-content: space-between; border-bottom: 1px solid #dbe5e9; padding-bottom: 14px; margin-bottom: 16px; gap: 12px; }
.rx-review-item { margin: 16px 0; padding: 14px 0; border-bottom: 1px solid #dbe5e9; }
.rx-review-item p { margin-top: 6px; }
.rx-free-text { white-space: pre-wrap; overflow-wrap: anywhere; }
@media (max-width: 700px) {
    .rx-sheet { height: 100vh; max-height: 100vh; }
    .rx-sheet-header { padding: 14px 16px; }
    .rx-sheet-body { padding: 12px; }
    .rx-paper { padding: 14px; }
    .rx-metadata, .rx-details-fields { grid-template-columns: 1fr; }
    .rx-core-fields { grid-template-columns: 1fr 1fr; }
    .rx-allergies { display: block; }
    .rx-context-actions { margin-top: 4px; }
    .rx-sheet-footer { padding: 10px 12px; display: block; }
    .rx-sheet-footer > p { display: none; }
    .rx-footer-actions { display: grid; grid-template-columns: 1fr 1fr; }
    .rx-button--primary { grid-column: 1 / -1; }
    .rx-footer-actions .rx-button { padding: 8px; font-size: 13px; }
}
@media (max-width: 360px) { .rx-core-fields { grid-template-columns: 1fr; } }
</style>
