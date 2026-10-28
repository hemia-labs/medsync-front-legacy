<template>
    <div v-if="sectionAllowed" class="w-full pb-8">
        <v-alert v-if="activeSection === 'summary' && (appearanceError || clinicalModulesError)" type="error" text role="alert">Algunos ajustes opcionales no se pudieron consultar. <button type="button" class="underline font-semibold" @click="init">Reintentar consulta</button></v-alert>
        <preparation-guide v-if="['identity','documents'].includes(activeSection) && !documentTemplateDialog" :key="activeSection" :branch="activeSection" :stage="activeSection==='identity' && businessInfoEditing ? 'edit' : ''" :dirty="hasUnsavedChanges" :busy="settingsSaving" @focus-control="focusPreparationControl" />
        <admin-summary v-if="activeSection === 'summary'" :items="configurationSummary"></admin-summary>

        <roles-permissions-config
            v-if="activeSection === 'roles-permissions'" @contact-plan="$emit('contact-plan', $event)"
        ></roles-permissions-config>

        <section ref="preparationEditor" v-if="activeSection === 'doctor-identity'" class="bg-white bg-opacity-95 border border-primary-200 shadow-xl">
            <div class="px-7 py-5 border-b border-primary-200 bg-primary-100">
                <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Identidad del doctor</p>
                <h2 class="m-0 text-gray-600 text-2xl font-normal">Perfil profesional</h2>
                <p class="m-0 mt-2 text-gray-500 text-sm">Completa tus datos profesionales para emitir recetas y firmar documentos clínicos.</p>
            </div>

            <div class="p-7">
                <da-professional-profile
                    v-if="authUser && authUser.id_login"
                    :id-login="authUser.id_login"
                    v-on:saved="onProfessionalProfileSaved"
                    v-on:error="toastFunction('error',$event)"
                ></da-professional-profile>
            </div>
        </section>

        <section v-if="activeSection === 'clinical-modules'" class="bg-white bg-opacity-95 border border-primary-200 shadow-xl">
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 px-7 py-5 border-b border-primary-200 bg-primary-100">
                <div>
                    <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Secciones clínicas</p>
                    <h2 class="m-0 text-gray-600 text-2xl font-normal">Expediente del paciente</h2>
                    <p class="m-0 mt-2 text-gray-500 text-sm">Elige qué apartados aparecen dentro del expediente del paciente.</p>
                </div>
                <div class="flex flex-wrap justify-start lg:justify-end gap-2">
                    <da-button-primary @click.native="onSaveClinicalModules()" :disabled="clinicalModulesLoading || !!clinicalModulesError || clinicalModulesSaving" :label="clinicalModulesSaving ? 'Guardando...' : 'Guardar secciones'" rxl swpr class="py-1 px-3 font-light"></da-button-primary>
                </div>
            </div>

            <p v-if="clinicalModulesLoading" class="p-7" role="status">Cargando las secciones guardadas…</p>
            <v-alert v-else-if="clinicalModulesError" type="error" text role="alert" class="m-5">{{ clinicalModulesError }} <button type="button" class="underline font-semibold" @click="onLoadClinicalModules">Reintentar</button></v-alert>
            <fieldset v-else class="grid grid-cols-1 md:grid-cols-2 gap-5 p-7 min-w-0" :disabled="clinicalModulesSaving">
                <article class="border border-gray-200 bg-white shadow-md p-5">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Odontograma</p>
                            <h3 class="m-0 text-gray-700 text-lg font-semibold">Mostrar odontograma</h3>
                            <p class="m-0 mt-2 text-gray-500 text-sm leading-relaxed">Aparece oculto al inicio. Actívalo solo si tu consultorio registra odontogramas.</p>
                        </div>
                        <v-switch v-model="clinicalModulesForm.odontogramEnabled" :disabled="clinicalModulesSaving" aria-label="Mostrar odontograma" inset :color="themePrimaryColor" class="m-0"></v-switch>
                    </div>
                    <div class="mt-4 px-3 py-2 text-sm border" :class="clinicalModulesForm.odontogramEnabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'">
                        {{ clinicalModulesForm.odontogramEnabled ? 'Odontograma visible en expediente.' : 'Odontograma oculto en expediente.' }}
                    </div>
                </article>

                <article class="border border-gray-200 bg-white shadow-md p-5">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Plan de tratamiento</p>
                            <h3 class="m-0 text-gray-700 text-lg font-semibold">Tratamientos activos e historicos</h3>
                            <p class="m-0 mt-2 text-gray-500 text-sm leading-relaxed">Permite crear un plan activo por paciente, cerrarlo como historico y abrir uno nuevo.</p>
                        </div>
                        <v-switch v-model="clinicalModulesForm.treatmentPlanEnabled" :disabled="clinicalModulesSaving" aria-label="Mostrar plan de tratamiento" inset :color="themePrimaryColor" class="m-0"></v-switch>
                    </div>
                    <div class="mt-4 px-3 py-2 text-sm border" :class="clinicalModulesForm.treatmentPlanEnabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'">
                        {{ clinicalModulesForm.treatmentPlanEnabled ? 'Plan de tratamiento visible en expediente.' : 'Plan de tratamiento oculto en expediente.' }}
                    </div>
                </article>

                <article class="border border-gray-200 bg-white shadow-md p-5">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Dientes en tratamiento</p>
                            <h3 class="m-0 text-gray-700 text-lg font-semibold">Asociar tratamientos a dientes</h3>
                            <p class="m-0 mt-2 text-gray-500 text-sm leading-relaxed">Solo aplica cuando el odontograma esta activo. El diente nunca sera obligatorio.</p>
                        </div>
                        <v-switch v-model="clinicalModulesForm.allowTreatmentToothSelection" aria-label="Asociar tratamientos a dientes" :disabled="clinicalModulesSaving || !clinicalModulesForm.odontogramEnabled" inset :color="themePrimaryColor" class="m-0"></v-switch>
                    </div>
                    <div class="mt-4 px-3 py-2 text-sm border" :class="clinicalModulesForm.odontogramEnabled && clinicalModulesForm.allowTreatmentToothSelection ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'">
                        {{ clinicalModulesForm.odontogramEnabled && clinicalModulesForm.allowTreatmentToothSelection ? 'Los tratamientos pueden guardar dientes asociados.' : 'No se mostrara selector de dientes en tratamientos.' }}
                    </div>
                </article>

                <article class="border border-gray-200 bg-white shadow-md p-5">
                    <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Campos visibles</p>
                    <h3 class="m-0 text-gray-700 text-lg font-semibold">Resumen del plan</h3>
                    <p class="m-0 mt-2 text-gray-500 text-sm leading-relaxed">Controla si el plan muestra costos y estados en la vista clinica.</p>
                    <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label class="flex items-center gap-2 text-sm text-gray-600">
                            <v-checkbox v-model="clinicalModulesForm.showTreatmentCosts" :disabled="clinicalModulesSaving" aria-label="Mostrar costos" :color="themePrimaryColor" hide-details class="m-0 p-0"></v-checkbox>
                            Mostrar costos
                        </label>
                        <label class="flex items-center gap-2 text-sm text-gray-600">
                            <v-checkbox v-model="clinicalModulesForm.showTreatmentStatus" :disabled="clinicalModulesSaving" aria-label="Mostrar estados" :color="themePrimaryColor" hide-details class="m-0 p-0"></v-checkbox>
                            Mostrar estados
                        </label>
                    </div>
                </article>

            </fieldset>
        </section>

        <section ref="preparationEditor" v-if="activeSection === 'identity'" class="bg-white bg-opacity-95 border border-primary-200 shadow-xl">
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 px-7 py-5 border-b border-primary-200 bg-primary-100">
                <div>
                    <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Informacion del consultorio</p>
                    <h2 class="m-0 text-gray-600 text-2xl font-normal">Perfil de cuenta del consultorio</h2>
                    <p class="m-0 mt-2 text-gray-500 text-sm">Datos visibles del consultorio y estado operativo de la cuenta.</p>
                </div>
                <div class="flex flex-wrap items-center justify-start lg:justify-end gap-3">
                    <da-button-primary
                        ref="guideIdentityAction" v-if="!businessInfoEditing"
                        @click.native="onStartBusinessInfoEdit()"
                        :label="'Editar datos'" :disabled="businessInfoLoading || !!businessInfoError || !businessInfoOriginal"
                        rxl
                        swpr
                        class="py-1 px-3 font-light"
                    ></da-button-primary>
                    <button
                        v-if="businessInfoEditing"
                        type="button"
                        class="cursor-pointer border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 font-semibold shadow-sm"
                        @click="onCancelBusinessInfoEdit()" :disabled="businessInfoSaving"
                    >
                        Cancelar
                    </button>
                    <da-button-primary
                        v-if="businessInfoEditing"
                        ref="guideIdentityAction" @click.native="onSaveBusinessInfo()"
                        :label="businessInfoSaving ? 'Guardando...' : 'Guardar cambios'"
                        :disabled="businessInfoSaving"
                        rxl
                        swpr
                        class="py-1 px-3 font-light"
                    ></da-button-primary>
                </div>
            </div>

            <p v-if="businessInfoLoading" class="p-7" role="status">Cargando los datos guardados del consultorio…</p>
            <v-alert v-else-if="businessInfoError" type="error" text role="alert" class="m-5">{{ businessInfoError }} <button type="button" class="underline font-semibold" @click="onGetBusinessInfo">Reintentar</button></v-alert>
            <div v-if="!businessInfoLoading && !businessInfoError && !businessInfoEditing" class="grid grid-cols-1 lg:grid-cols-2 gap-6 p-7 pb-0">
                <article class="min-w-0 border border-gray-200 bg-white shadow-sm p-5">
                    <div class="flex items-start gap-3">
                        <div class="flex items-center justify-center w-10 h-10 bg-primary-100 text-primary-900 border border-primary-200">
                            <v-icon color="inherit" size="22">mdi-office-building-outline</v-icon>
                        </div>
                        <div>
                            <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Perfil del consultorio</p>
                            <h3 class="m-0 text-gray-700 text-lg font-semibold">Nombre e identidad visible</h3>
                        </div>
                    </div>
                    <dl class="m-0 mt-5 divide-y divide-gray-100">
                        <div class="py-3">
                            <dt class="text-xs font-bold uppercase tracking-wider text-gray-500">Nombre comercial</dt>
                            <dd class="m-0 mt-1 text-gray-800 font-semibold break-words">{{ businessInfo.name || 'Sin nombre configurado' }}</dd>
                        </div>
                        <div class="py-3">
                            <dt class="text-xs font-bold uppercase tracking-wider text-gray-500">Razon social</dt>
                            <dd class="m-0 mt-1 text-gray-700 break-words">{{ businessInfo.legalName || 'Sin razon social configurada' }}</dd>
                        </div>
                        <div class="py-3">
                            <dt class="text-xs font-bold uppercase tracking-wider text-gray-500">Logo</dt>
                            <dd class="m-0 mt-1">
                                <a v-if="businessInfo.logoUrl" :href="businessInfo.logoUrl" target="_blank" rel="noopener noreferrer" class="text-primary-900 font-semibold break-all">Ver logo configurado</a>
                                <span v-else class="text-gray-500">Sin logo configurado</span>
                            </dd>
                        </div>
                    </dl>
                </article>

                <article class="min-w-0 border border-gray-200 bg-white shadow-sm p-5">
                    <div class="flex items-start gap-3">
                        <div class="flex items-center justify-center w-10 h-10 bg-primary-100 text-primary-900 border border-primary-200">
                            <v-icon color="inherit" size="22">mdi-map-marker-outline</v-icon>
                        </div>
                        <div>
                            <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Contacto y ubicacion</p>
                            <h3 class="m-0 text-gray-700 text-lg font-semibold">Canales del consultorio</h3>
                        </div>
                    </div>
                    <dl class="m-0 mt-5 divide-y divide-gray-100">
                        <div class="py-3">
                            <dt class="text-xs font-bold uppercase tracking-wider text-gray-500">Email de contacto</dt>
                            <dd class="m-0 mt-1 text-gray-700 break-all">{{ businessInfo.email || 'Sin email configurado' }}</dd>
                        </div>
                        <div class="py-3">
                            <dt class="text-xs font-bold uppercase tracking-wider text-gray-500">Telefono del consultorio</dt>
                            <dd class="m-0 mt-1 text-gray-700 break-words">{{ businessInfo.phone || 'Sin telefono configurado' }}</dd>
                        </div>
                        <div class="py-3">
                            <dt class="text-xs font-bold uppercase tracking-wider text-gray-500">Domicilio</dt>
                            <dd class="m-0 mt-1 text-gray-700 whitespace-pre-line break-words">{{ businessInfo.address || 'Sin domicilio configurado' }}</dd>
                        </div>
                    </dl>
                </article>
            </div>

            <v-alert v-if="businessInfoEditing && (businessSaveError || Object.keys(businessFieldErrors).length)" type="error" text role="alert" class="m-5">{{ businessSaveError || 'Revisa los campos señalados. Tu captura se conserva.' }}</v-alert>
            <div v-if="businessInfoEditing" class="grid grid-cols-1 lg:grid-cols-5 gap-6 p-7 pb-0">
                <article class="min-w-0 lg:col-span-2 border border-gray-200 bg-white shadow-sm p-5">
                    <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Perfil del consultorio</p>
                    <h3 class="m-0 text-gray-700 text-lg font-semibold">Nombre e identidad visible</h3>
                    <p class="m-0 mt-2 text-gray-500 text-sm leading-relaxed">Solo estos datos generales pueden modificarse desde esta pantalla.</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                        <v-text-field ref="business_name" v-model="businessInfo.name" :error-messages="businessFieldErrors.name" :disabled="businessInfoSaving" label="Nombre comercial *" dense outlined :color="themePrimaryColor"></v-text-field>
                        <v-text-field ref="business_legalName" v-model="businessInfo.legalName" :error-messages="businessFieldErrors.legalName" :disabled="businessInfoSaving" label="Razón social" dense outlined :color="themePrimaryColor"></v-text-field>
                    </div>
                    <v-text-field ref="business_logoUrl" v-model="businessInfo.logoUrl" :error-messages="businessFieldErrors.logoUrl" :disabled="businessInfoSaving" label="Enlace del logo del consultorio (opcional)" hint="Se usa al imprimir historias clínicas y en firmas públicas. El logo de acceso se configura en Apariencia." persistent-hint dense outlined :color="themePrimaryColor"></v-text-field>
                </article>

                <article class="min-w-0 lg:col-span-3 border border-gray-200 bg-white shadow-sm p-5">
                    <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Contacto y ubicacion</p>
                    <h3 class="m-0 text-gray-700 text-lg font-semibold">Canales del consultorio</h3>
                    <p class="m-0 mt-2 text-gray-500 text-sm leading-relaxed">Estos datos se usan como referencia operativa y en documentos del consultorio.</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                        <v-text-field ref="business_email" v-model="businessInfo.email" :error-messages="businessFieldErrors.email" :disabled="businessInfoSaving" label="Email contacto (opcional)" inputmode="email" dense outlined :color="themePrimaryColor"></v-text-field>
                        <v-text-field ref="business_phone" v-model="businessInfo.phone" :error-messages="businessFieldErrors.phone" :disabled="businessInfoSaving" label="Teléfono del consultorio *" inputmode="tel" hint="10 dígitos nacionales; también puedes pegar +52." persistent-hint dense outlined :color="themePrimaryColor"></v-text-field>
                    </div>
                    <v-textarea ref="business_address" v-model="businessInfo.address" :error-messages="businessFieldErrors.address" :disabled="businessInfoSaving" label="Domicilio *" rows="2" outlined :color="themePrimaryColor"></v-textarea>
                </article>
            </div>

            <div class="p-7">
                <article class="min-w-0 border border-gray-200 bg-gray-50 shadow-sm p-5">
                    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div>
                            <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Estado de la cuenta</p>
                            <h3 class="m-0 text-gray-700 text-lg font-semibold">{{ businessInfo.name || 'Consultorio' }}</h3>
                            <p class="m-0 mt-2 text-gray-500 text-sm leading-relaxed">Datos de cuenta, licencia y facturación administrados por MedSync.</p>
                        </div>
                        <span class="self-start inline-flex items-center px-3 py-1 bg-white border border-gray-200 text-gray-600 text-xs font-semibold uppercase tracking-wider">Solo lectura</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
                        <div class="border-l-4 border-primary-400 bg-white px-4 py-3 min-w-0">
                            <p class="m-0 text-xs font-bold uppercase tracking-wider text-gray-500">Identificador</p>
                            <p class="m-0 mt-1 text-gray-700 break-all">{{ businessInfo.slug || businessInfo.id_business || 'Sin identificador' }}</p>
                        </div>
                        <div class="border-l-4 border-blue-300 bg-white px-4 py-3 min-w-0">
                            <p class="m-0 text-xs font-bold uppercase tracking-wider text-gray-500">Plan</p>
                            <p class="m-0 mt-1 text-gray-700">{{ businessPlanLabel }}</p>
                        </div>
                        <div class="border-l-4 border-green-300 bg-white px-4 py-3 min-w-0">
                            <p class="m-0 text-xs font-bold uppercase tracking-wider text-gray-500">Estado</p>
                            <p class="m-0 mt-1 text-gray-700">{{ businessStatusLabel }}</p>
                        </div>
                        <div class="border-l-4 border-yellow-300 bg-white px-4 py-3 min-w-0">
                            <p class="m-0 text-xs font-bold uppercase tracking-wider text-gray-500">Periodo de prueba</p>
                            <p class="m-0 mt-1 text-gray-700">{{ formatBusinessDate(businessInfo.trialEndsAt) }}</p>
                        </div>
                        <div class="border-l-4 border-gray-300 bg-white px-4 py-3 min-w-0">
                            <p class="m-0 text-xs font-bold uppercase tracking-wider text-gray-500">Licencia y facturación</p>
                            <p class="m-0 mt-1 text-gray-700">Gestionado por MedSync</p>
                        </div>
                    </div>
                </article>
            </div>
        </section>

        <account-legal-documents v-if="activeSection === 'account-legal'" />
        <change-password v-if="activeSection === 'change-password'" :key="authUser && authUser.id_login" />

        <section ref="preparationEditor" v-if="activeSection === 'documents'" class="bg-white bg-opacity-95 border border-primary-200 shadow-xl">
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 px-7 py-5 border-b border-primary-200 bg-primary-100">
                <div>
                    <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Documentos y consentimientos</p>
                    <h2 class="m-0 text-gray-600 text-2xl font-normal">Textos y formatos del consultorio</h2>
                    <p class="m-0 mt-2 text-gray-500 text-sm">Centraliza consentimientos, datos sensibles, atención general y formatos personalizados del consultorio.</p>
                </div>
                <div class="flex flex-wrap justify-start lg:justify-end gap-2">
                    <da-button-primary ref="guideDocumentsAction" @click.native="openDocumentTemplateDialog()" :label="'+ Crear formato'" rxl swpr class="py-1 px-3 font-light"></da-button-primary>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 p-7">
                <article class="min-w-0 lg:col-span-5 border border-gray-200 bg-white shadow-md p-5">
                    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Plantillas del consultorio</p>
                            <h3 class="m-0 text-gray-700 text-lg font-semibold">Consentimientos y formatos personalizados</h3>
                            <p class="m-0 mt-2 text-gray-500 text-sm">
                                Estas plantillas usan versiones. Editar una plantilla no modifica documentos ya firmados.
                            </p>
                        </div>
                        <button type="button" class="cursor-pointer border border-primary-200 bg-primary-100 hover:bg-primary-200 text-primary-900 px-4 py-2 font-semibold shadow-sm" :disabled="documentTemplatesLoading" @click="onGetDocumentTemplates()">{{ documentTemplatesLoading ? 'Cargando…' : 'Recargar lista' }}</button>
                    </div>

                    <p v-if="documentTemplatesLoading" role="status" class="mt-4">Cargando plantillas…</p>
                    <v-alert v-else-if="documentTemplatesError" type="error" text role="alert" class="mt-4">{{ documentTemplatesError }}</v-alert>
                    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                        <article
                            v-for="template in documentTemplates"
                            :key="template.id_document_template"
                            class="border border-gray-200 bg-gray-50 p-4"
                        >
                            <div class="flex items-start justify-between gap-3">
                                <div>
                                    <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Tipo: {{ documentTemplateTypeLabel(template.template_type) }}</p>
                                    <h4 class="m-0 mt-1 text-gray-700 text-base font-semibold">{{ humanizeDocumentText(template.name) }}</h4>
                                    <p class="m-0 mt-1 text-gray-500 text-sm">{{ humanizeDocumentText(template.description) || 'Sin descripción.' }}</p>
                                </div>
                                <span class="px-2 py-1 text-xs font-bold border" :class="template.is_active !== 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'">
                                    {{ template.is_active !== 0 ? 'Activa' : 'Inactiva' }}
                                </span>
                            </div>
                            <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                                <span><strong>Versión:</strong> {{ template.version_number || 1 }}</span>
                                <span><strong>Estado:</strong> {{ template.is_active !== 0 ? 'Activa' : 'Inactiva' }}</span>
                                <span><strong>Clasificación:</strong> {{ documentTemplateLicenseLabel(template) }}</span>
                                <span class="sm:col-span-2"><strong>Firmas requeridas:</strong> {{ documentTemplateSignaturesLabel(template) }}</span>
                            </div>
                            <div class="mt-4 flex justify-end">
                                <button type="button" class="cursor-pointer border border-primary-200 bg-primary-100 hover:bg-primary-200 text-primary-900 px-4 py-2 font-semibold shadow-sm" @click="openDocumentTemplateDialog(template)">Editar</button>
                            </div>
                        </article>

                        <article v-if="!documentTemplatesLoading && !documentTemplatesError && documentTemplates.length === 0" class="border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-gray-500 md:col-span-2">
                            No hay plantillas configuradas. Crea un formato para usarlo en Documentos y firmas.
                        </article>
                    </div>

                    <div class="mt-5 border border-gray-200 bg-gray-50 p-4">
                        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                                <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Datos automáticos disponibles</p>
                                <p class="m-0 text-gray-500 text-sm">Paciente, doctor, consultorio, fecha, diagnóstico, plan de tratamiento y tutor.</p>
                            </div>
                            <button type="button" class="cursor-pointer border border-primary-200 bg-white hover:bg-primary-100 text-primary-900 px-4 py-2 font-semibold" @click="automaticDataHelpDialog = true">Ver datos automáticos</button>
                        </div>
                    </div>
                </article>

            </div>
        </section>

        <section v-if="activeSection === 'appearance'" class="bg-white bg-opacity-95 border border-primary-200 shadow-xl">
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 px-7 py-5 border-b border-primary-200 bg-primary-100">
                <div>
                    <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Pantalla de acceso</p>
                    <h2 class="m-0 text-gray-600 text-2xl font-normal">Logo de acceso</h2>
                    <p class="m-0 mt-2 text-gray-500 text-sm">Recomendado: PNG o WEBP horizontal de 700x250, maximo 2 MB despues de optimizar.</p>
                </div>
                <div class="flex flex-wrap justify-start lg:justify-end gap-2">
                    <input
                        :key="loginImageInputKey"
                        ref="loginImageFile"
                        type="file"
                        class="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        @change="onSelectLoginImage"
                    />
                    <da-button-secondary @click.native="$refs.loginImageFile.click()" :disabled="loginImageSaving || loginImageProcessing || appearanceLoading || !!appearanceError" :label="loginImageProcessing ? 'Preparando imagen...' : 'Seleccionar logo'" rxl swpr class="py-1 px-3 font-light"></da-button-secondary>
                    <da-button-primary @click.native="onSaveLoginImage()" :disabled="loginImageSaving || loginImageProcessing || appearanceLoading || !!appearanceError" :label="loginImageSaving ? 'Guardando...' : 'Guardar logo'" rxl swpr class="py-1 px-3 font-light"></da-button-primary>
                </div>
            </div>

            <p v-if="appearanceLoading" class="p-7" role="status">Cargando la apariencia guardada…</p>
            <v-alert v-if="appearanceError" type="error" text role="alert" class="m-5">{{ appearanceError }} <button type="button" class="underline font-semibold" @click="onLoadAppearance">Reintentar</button></v-alert>
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 p-7">
                <div class="lg:col-span-3 h-56 bg-gray-100 bg-center bg-contain bg-no-repeat border border-gray-200 flex items-center justify-center text-gray-500" :style="loginImagePreviewStyle">
                    <span v-if="!loginImagePreview">Vista previa</span>
                </div>
                <div class="lg:col-span-2">
                    <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Archivo actual</p>
                    <h3 class="m-0 mb-3 text-gray-600 text-lg font-semibold break-words">{{ loginImageFileName || 'Sin logo personalizado' }}</h3>
                    <p class="text-gray-500 leading-relaxed">Este logo identifica el acceso y la cabecera del sistema. No cambia el logo del consultorio en historias clínicas o firmas públicas, que se configura en Datos del consultorio.</p>
                    <p v-if="loginImageError" class="text-red-600 font-semibold">{{ loginImageError }}</p>
                </div>
            </div>
        </section>

        <prescription-config
            v-if="activeSection === 'prescriptions'"
            :theme-color="themePrimaryColor"
            @saved="toastFunction('success','Configuración de recetas guardada.')"
            @error="toastFunction('error',$event)"
        ></prescription-config>

        <clinical-history-template-config
            v-if="activeSection === 'clinical-history-template'" @contact-plan="$emit('contact-plan', $event)"
            :theme-color="themePrimaryColor"
            @saved="toastFunction('success',$event)"
            @error="toastFunction('error',$event)"
        ></clinical-history-template-config>

        <section v-if="activeSection === 'appearance'" class="mt-6 bg-white bg-opacity-95 border border-primary-200 shadow-xl">
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 px-7 py-5 border-b border-primary-200 bg-primary-100">
                <div>
                    <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Apariencia</p>
                    <h2 class="m-0 text-gray-600 text-2xl font-normal">Tema del sistema</h2>
                    <p class="m-0 mt-2 text-gray-500 text-sm">Elige la paleta de colores que verán los usuarios en el sistema.</p>
                </div>
                <div class="flex flex-wrap justify-start lg:justify-end gap-2">
                    <da-button-primary @click.native="onSaveTheme()" :disabled="isThemeSaving || appearanceLoading || !!appearanceError" :label="isThemeSaving ? 'Guardando...' : 'Guardar tema'" rxl swpr class="py-1 px-3 font-light"></da-button-primary>
                </div>
            </div>

            <p v-if="appearanceDirty" class="px-7 pt-5 text-sm" role="status">Vista previa sin guardar. Guarda cada cambio para aplicarlo al consultorio o descártalo al salir.</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 p-7" role="group" aria-label="Tema del sistema">
                <button
                    v-for="theme in themeList"
                    :key="theme.code"
                    type="button"
                    class="settings-theme-option text-left border bg-white shadow-md p-4 transition duration-150 ease-in-out hover:shadow-xl" :disabled="isThemeSaving || appearanceLoading || !!appearanceError" :aria-pressed="selectedThemeCode === theme.code ? 'true' : 'false'"
                    :class="selectedThemeCode === theme.code ? 'border-primary-700' : 'border-gray-200'"
                    @click="onSelectTheme(theme)"
                >
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <p class="m-0 text-gray-700 text-lg font-semibold">{{ theme.name }}</p>
                            <p class="m-0 mt-1 text-gray-500 text-sm leading-snug">{{ theme.description }}</p>
                        </div>
                        <v-icon v-if="selectedThemeCode === theme.code" color="green">mdi-check-circle</v-icon>
                    </div>

                    <div class="flex gap-2 mt-5">
                        <span
                            v-for="color in themeSwatches(theme)"
                            :key="color"
                            class="block h-8 w-8 rounded-full border border-gray-200"
                            :style="`background-color: ${color}`"
                        ></span>
                    </div>
                </button>
            </div>
        </section>

        <professional-agenda-config v-if="activeSection === 'agenda'" :initial-doctor-id="typeof $route.query.doctor === 'string' ? $route.query.doctor : ''" :theme-color="themePrimaryColor" @saved="onGetAppointmentConfig" />
    <v-dialog v-if="activeSection === 'agenda'" v-model="dayDialog" persistent max-width="680">
            <v-card>
                <div class="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200">
                    <div>
                        <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Horario semanal</p>
                        <h3 class="m-0 mt-1 text-gray-700 text-xl font-semibold">Editar {{ dayName(editingDay.dayOfWeek) }}</h3>
                    </div>
                    <v-btn icon @click="dayDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
                </div>
                <v-card-text class="pt-5">
                    <v-switch v-model="editingDay.enabled" inset :color="themePrimaryColor" label="Dia laboral"></v-switch>
                    <div v-if="editingDay.enabled" class="space-y-3">
                        <div v-for="range in editingDay.timeRanges" :key="range.id" class="grid grid-cols-12 gap-2 items-center bg-gray-50 border border-gray-200 p-3">
                            <v-text-field v-model="range.startTime" type="time" label="Inicio" dense outlined hide-details :color="themePrimaryColor" class="col-span-5"></v-text-field>
                            <v-text-field v-model="range.endTime" type="time" label="Fin" dense outlined hide-details :color="themePrimaryColor" class="col-span-5"></v-text-field>
                            <v-btn icon class="col-span-2" @click="removeEditingRange(range.id)">
                                <v-icon color="#A6001E">mdi-delete-outline</v-icon>
                            </v-btn>
                        </div>
                        <da-button-secondary @click.native="addEditingRange()" :label="'+ Agregar rango'" rxl swpr class="py-1 px-3 font-light"></da-button-secondary>
                    </div>
                    <p v-else class="m-0 text-sm text-gray-500">Este dia no generara horarios disponibles.</p>
                    <p v-if="editingDayError" class="mt-3 text-red-600 font-semibold">{{ editingDayError }}</p>
                </v-card-text>
                <v-card-actions class="px-6 pb-5 justify-end">
                    <da-button-secondary @click.native="dayDialog = false" :label="'Cancelar'" rxl swpr class="py-1 px-4 font-light"></da-button-secondary>
                    <da-button-primary @click.native="saveEditingDay()" :label="'Guardar dia'" rxl swpr class="py-1 px-4 font-light"></da-button-primary>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-if="activeSection === 'agenda'" v-model="copyDialog" max-width="520">
            <v-card>
                <div class="px-6 py-5 border-b border-gray-200">
                    <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Copiar horario</p>
                    <h3 class="m-0 mt-1 text-gray-700 text-xl font-semibold">Copiar {{ dayName(copySourceDay.dayOfWeek) }}</h3>
                </div>
                <v-card-text class="pt-5">
                    <p class="text-gray-600">Selecciona los dias que recibiran los mismos rangos.</p>
                    <v-checkbox
                        v-for="day in copyTargetOptions"
                        :key="day.value"
                        v-model="copyTargetDays"
                        :value="day.value"
                        :label="day.label"
                        :color="themePrimaryColor"
                        hide-details
                    ></v-checkbox>
                </v-card-text>
                <v-card-actions class="px-6 pb-5 justify-end">
                    <da-button-secondary @click.native="copyDialog = false" :label="'Cancelar'" rxl swpr class="py-1 px-4 font-light"></da-button-secondary>
                    <da-button-primary @click.native="copyScheduleToTargets()" :label="'Copiar horario'" rxl swpr class="py-1 px-4 font-light"></da-button-primary>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-if="activeSection === 'agenda'" v-model="blockDialog" max-width="620">
            <v-card>
                <div class="px-6 py-5 border-b border-gray-200">
                    <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Bloqueos</p>
                    <h3 class="m-0 mt-1 text-gray-700 text-xl font-semibold">{{ blockMode === 'date' ? 'Bloquear dia completo' : 'Bloquear horario especifico' }}</h3>
                </div>
                <v-card-text class="pt-5">
                    <v-checkbox v-if="blockMode === 'hour'" v-model="editingBlock.repeats" label="Repetir cada semana" :color="themePrimaryColor" hide-details class="mb-3"></v-checkbox>
                    <v-text-field v-if="blockMode === 'date' || !editingBlock.repeats" v-model="editingBlock.date" type="date" label="Fecha" dense outlined :color="themePrimaryColor"></v-text-field>
                    <v-select v-if="blockMode === 'hour' && editingBlock.repeats" v-model="editingBlock.dayOfWeek" :items="weekDays" item-text="label" item-value="value" label="Dia semanal" dense outlined :color="themePrimaryColor"></v-select>
                    <div v-if="blockMode === 'hour'" class="grid grid-cols-2 gap-3">
                        <v-text-field v-model="editingBlock.startTime" type="time" label="Inicio" dense outlined :color="themePrimaryColor"></v-text-field>
                        <v-text-field v-model="editingBlock.endTime" type="time" label="Fin" dense outlined :color="themePrimaryColor"></v-text-field>
                    </div>
                    <v-text-field v-model="editingBlock.reason" label="Motivo" dense outlined :color="themePrimaryColor"></v-text-field>
                    <v-checkbox v-if="blockMode === 'date'" v-model="editingBlock.repeats" label="Repetir cada semana" :color="themePrimaryColor" hide-details></v-checkbox>
                    <p v-if="blockError" class="mt-3 text-red-600 font-semibold">{{ blockError }}</p>
                </v-card-text>
                <v-card-actions class="px-6 pb-5 justify-end">
                    <da-button-secondary @click.native="blockDialog = false" :label="'Cancelar'" rxl swpr class="py-1 px-4 font-light"></da-button-secondary>
                    <da-button-primary @click.native="saveBlock()" :label="'Guardar bloqueo'" rxl swpr class="py-1 px-4 font-light"></da-button-primary>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-if="activeSection === 'documents'" v-model="documentTemplateDialog" persistent scrollable :retain-focus="false" max-width="1180" role="dialog" aria-modal="true" aria-labelledby="document-template-title" @keydown.esc="onCancelDocumentTemplate">
            <v-card>
                <div class="px-6 py-5 border-b border-gray-200 bg-primary-100">
                    <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Formato clínico</p>
                    <preparation-guide v-if="documentTemplateDialog" branch="documents" stage="edit" :action-label="documentTemplateSaveLabel" :subject="documentTemplateForm.id_document_template || 'new'" :dirty="documentTemplateDirty" :busy="documentTemplateSaving" @focus-control="focusPreparationControl" />
                    <h3 id="document-template-title" class="m-0 mt-1 text-gray-700 text-xl font-semibold">{{ documentTemplateForm.id_document_template ? 'Editar plantilla' : 'Crear plantilla' }}</h3>
                    <p class="m-0 mt-2 text-gray-500 text-sm">Los cambios solo aplicarán a documentos nuevos. Los documentos ya firmados no cambian.</p>
                </div>
                <v-card-text class="pt-5 settings-dialog-scroll">
                    <v-alert v-if="documentTemplateSaveError || Object.keys(documentTemplateErrors).length" type="error" text role="alert">{{ documentTemplateSaveError || 'Revisa el nombre y el contenido señalados. Tu captura se conserva.' }}</v-alert>
                    <fieldset :disabled="documentTemplateSaving" class="min-w-0">
                    <div class="border border-primary-200 bg-primary-100 p-4 mb-4">
                        <p class="m-0 text-gray-700 font-semibold">Escribe el documento como normalmente lo harías.</p>
                        <p class="m-0 mt-1 text-gray-500 text-sm">
                            Cuando necesites agregar información del paciente, doctor o consultorio, usa los datos automáticos. El sistema los llenará al generar el documento.
                        </p>
                        <p class="m-0 mt-2 text-gray-500 text-sm" v-pre>
                            Ejemplo: “Yo, {{nombrePaciente}}, autorizo...” se convertirá en “Yo, Nathaly Robles Juárez, autorizo...”.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <v-text-field ref="documentTemplateName" v-model="documentTemplateForm.name" :disabled="documentTemplateSaving" :error-messages="documentTemplateErrors.name" label="Nombre del formato *" dense outlined :color="themePrimaryColor"></v-text-field>
                        <v-select ref="guideDocumentType" v-model="documentTemplateForm.template_type" :disabled="documentTemplateSaving" :items="documentTemplateTypeOptions" item-text="label" item-value="value" label="Tipo de documento" dense outlined :color="themePrimaryColor"></v-select>
                        <v-select
                            v-model="documentTemplateForm.document_license_tier" :disabled="documentTemplateSaving"
                            :items="documentLicenseTierOptionsForPlan"
                            item-text="label"
                            item-value="value"
                            item-disabled="disabled"
                            label="Clasificación del formato"
                            dense
                            outlined
                            :color="themePrimaryColor"
                        ></v-select>
                    </div>
                    <div v-if="selectedDocumentTierLocked" class="border border-gray-300 bg-gray-50 text-gray-700 p-4 mb-4">
                        <p class="m-0 font-semibold">{{ selectedDocumentTierLocked.title }}</p>
                        <p class="m-0 mt-1 text-sm">{{ selectedDocumentTierLocked.message }}</p>
                        <button type="button" class="mt-3 border border-primary-700 bg-white text-primary-900 px-4 py-2 text-sm font-semibold" @click="$emit('contact-plan')">Contactar para cambiar plan</button>
                    </div>
                    <v-textarea v-model="documentTemplateForm.description" :disabled="documentTemplateSaving" label="Descripción opcional" rows="2" outlined :color="themePrimaryColor"></v-textarea>

                    <div class="border border-gray-200 bg-gray-50 p-4 mb-4">
                        <p class="m-0 mb-2 text-primary-900 text-xs font-bold tracking-widest uppercase">Estado de la plantilla</p>
                        <v-checkbox ref="guideDocumentActive" v-model="documentTemplateForm.is_active" :disabled="documentTemplateSaving" label="Plantilla activa" :color="themePrimaryColor" hide-details></v-checkbox>
                        <p class="m-0 mt-2 text-gray-500 text-xs">Una plantilla activa puede usarse para crear documentos nuevos.</p>
                    </div>

                    <div ref="guideDocumentSignatures" class="border border-gray-200 bg-gray-50 p-4 mb-4">
                        <p class="m-0 mb-2 text-primary-900 text-xs font-bold tracking-widest uppercase">Firmas requeridas</p>
                        <p class="m-0 mb-3 text-gray-500 text-sm">Selecciona quién debe firmar este documento. Cuando se genere, el sistema pedirá las firmas marcadas aquí.</p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            <v-checkbox v-model="documentTemplateForm.requires_patient_signature" :disabled="documentTemplateSaving" label="Paciente" :color="themePrimaryColor" hide-details></v-checkbox>
                            <v-checkbox v-model="documentTemplateForm.requires_tutor_signature" :disabled="documentTemplateSaving" label="Solicitar firma de tutor o representante" :color="themePrimaryColor" hide-details></v-checkbox>
                            <v-checkbox v-model="documentTemplateForm.requires_doctor_signature" :disabled="documentTemplateSaving" label="Doctor" :color="themePrimaryColor" hide-details></v-checkbox>
                            <v-checkbox v-model="documentTemplateForm.requires_witness1_signature" label="Testigo 1" :color="themePrimaryColor" hide-details></v-checkbox>
                            <v-checkbox v-model="documentTemplateForm.requires_witness2_signature" label="Testigo 2" :color="themePrimaryColor" hide-details></v-checkbox>
                        </div>
                        <p class="m-0 mt-3 text-gray-500 text-xs">Tutor o representante: úsalo cuando el paciente sea menor de edad o cuando otra persona autorizada firme en su nombre. Doctor: úsalo si el documento debe incluir firma del doctor responsable.</p>
                    </div>

                    <div class="border border-gray-200 bg-white p-4 mb-4">
                        <div class="mb-4">
                            <div>
                                <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Contenido</p>
                                <p v-if="documentContentMode === 'edit'" class="m-0 mt-1 text-gray-500 text-sm">{{ documentTemplateForm.advanced_mode ? 'Edita el contenido en modo de soporte.' : 'Escribe el contenido del documento. Puedes insertar datos automáticos para que el sistema los complete al generarlo.' }}</p>
                                <p v-else class="m-0 mt-1 text-gray-500 text-sm">Esta vista previa usa datos de ejemplo. Al generar el documento se usarán los datos reales del paciente.</p>
                            </div>
                            <div class="mt-4">
                                <div class="border border-primary-200 bg-white p-1 grid grid-cols-2 w-full">
                                    <button
                                        type="button"
                                        class="cursor-pointer px-4 py-3 text-sm font-semibold"
                                        :class="documentContentMode === 'edit' ? 'bg-primary-100 text-primary-900 shadow-sm' : 'text-gray-600 hover:bg-gray-50'"
                                        @click="documentContentMode = 'edit'"
                                    >
                                        Editar documento
                                    </button>
                                    <button
                                        type="button"
                                        class="cursor-pointer px-4 py-3 text-sm font-semibold"
                                        :class="documentContentMode === 'preview' ? 'bg-primary-100 text-primary-900 shadow-sm' : 'text-gray-600 hover:bg-gray-50'"
                                        @click="documentContentMode = 'preview'"
                                    >
                                        Vista previa
                                    </button>
                                </div>
                                <div v-if="documentContentMode === 'edit'" class="mt-3 flex flex-wrap items-center justify-start gap-3">
                                    <button
                                        type="button"
                                        class="cursor-pointer border border-primary-200 bg-primary-100 hover:bg-primary-200 text-primary-900 px-4 py-2 text-sm font-semibold shadow-sm"
                                        @click="requestInsertDocumentExample()"
                                    >
                                        Insertar ejemplo
                                    </button>
                                    <v-checkbox
                                        v-model="documentTemplateForm.advanced_mode" :disabled="documentTemplateSaving"
                                        label="Usar edición con apoyo técnico"
                                        :color="themePrimaryColor"
                                        hide-details
                                        class="m-0"
                                        @change="onToggleDocumentAdvancedMode"
                                    ></v-checkbox>
                                </div>
                            </div>
                        </div>

                        <div v-if="documentContentMode === 'edit'">
                            <p v-if="documentTemplateForm.advanced_mode" class="border border-yellow-200 bg-yellow-50 text-yellow-800 p-3 text-sm">
                                Usa esta opción solo con apoyo técnico. El modo normal es suficiente para la mayoría de documentos.
                            </p>
                            <v-textarea
                                ref="documentContentInput"
                                v-model="activeDocumentContentModel" :disabled="documentTemplateSaving" :error-messages="documentTemplateErrors.content_html"
                                :label="documentTemplateForm.advanced_mode ? 'Contenido de soporte del documento' : 'Contenido del documento'"
                                rows="10"
                                outlined
                                spellcheck="false"
                                :color="themePrimaryColor"
                            ></v-textarea>
                            <p class="m-0 text-gray-500 text-xs">Si un dato opcional no existe, el sistema mostrará “No especificado”. Datos críticos como paciente, doctor y cédula se validan al generar documentos.</p>
                        </div>

                        <div v-else>
                            <div v-if="unknownDocumentVariables.length > 0" class="mb-4 border border-red-200 bg-red-50 text-red-700 p-4">
                                <p class="m-0 font-semibold">Hay datos automáticos que el sistema no reconoce.</p>
                                <ul class="m-0 mt-2 pl-5">
                                    <li v-for="item in unknownDocumentVariables" :key="item">{{ item }}</li>
                                </ul>
                            </div>
                            <div class="border border-gray-200 bg-gray-50 p-6">
                                <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">{{ humanizeDocumentText(documentTemplateForm.name) || 'Documento clínico' }}</p>
                                <div class="mt-4 bg-white border border-gray-200 p-6 leading-relaxed min-h-64" v-html="documentTemplatePreview"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Removed legacy duplicated content editor. -->
                    <div v-if="false" class="hidden">
                        <div>
                            <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Contenido</p>
                            <p class="m-0 mt-1 text-gray-500 text-sm">{{ documentTemplateForm.advanced_mode ? 'Edita el contenido en modo de soporte.' : 'Escribe el contenido del documento. Puedes insertar datos automáticos para que el sistema los complete al generarlo.' }}</p>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" class="cursor-pointer border border-primary-200 bg-white hover:bg-primary-100 text-primary-900 px-3 py-2 font-semibold" @click="insertDocumentExample()">Insertar ejemplo</button>
                            <button type="button" class="cursor-pointer border border-primary-200 bg-white hover:bg-primary-100 text-primary-900 px-3 py-2 font-semibold" @click="showDocumentPreview = !showDocumentPreview">{{ showDocumentPreview ? 'Ocultar vista previa' : 'Vista previa' }}</button>
                            <v-checkbox v-model="documentTemplateForm.advanced_mode" :disabled="documentTemplateSaving" label="Usar edición con apoyo técnico" :color="themePrimaryColor" hide-details class="m-0" @change="onToggleDocumentAdvancedMode"></v-checkbox>
                        </div>
                    </div>
                    <p v-if="false" class="border border-yellow-200 bg-yellow-50 text-yellow-800 p-3 text-sm">
                        Usa esta opción solo con apoyo técnico. El modo normal es suficiente para la mayoría de documentos.
                    </p>
                    <v-textarea
                        v-if="false"
                        ref="documentContentInput"
                        v-model="activeDocumentContentModel" :disabled="documentTemplateSaving" :error-messages="documentTemplateErrors.content_html"
                        :label="documentTemplateForm.advanced_mode ? 'Contenido de soporte del documento' : 'Contenido del documento'"
                        rows="10"
                        outlined
                        spellcheck="false"
                        :color="themePrimaryColor"
                    ></v-textarea>
                    <p v-if="false" class="m-0 mb-4 text-gray-500 text-xs">Si un dato opcional no existe, el sistema mostrará “No especificado”. Datos críticos como paciente, doctor y cédula se validan al generar documentos.</p>

                    <div class="border border-gray-200 bg-gray-50 p-4">
                        <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Datos que el sistema llenará automáticamente</p>
                        <p class="m-0 mt-1 mb-3 text-gray-500 text-sm">Estos datos se reemplazan automáticamente cuando generes el documento para un paciente.</p>
                        <p class="m-0 mt-1 mb-3 text-gray-500 text-sm">Haz clic en un dato para insertarlo en el contenido del documento.</p>
                        <v-text-field v-model="documentVariableSearch" label="Buscar dato automático" dense outlined hide-details :color="themePrimaryColor" class="mb-3"></v-text-field>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <article v-for="group in filteredDocumentVariableGroups" :key="group.title" class="bg-white border border-gray-200 p-3">
                                <p class="m-0 mb-2 text-gray-700 font-semibold">{{ group.title }}</p>
                                <div class="flex flex-wrap gap-2">
                                    <button
                                        v-for="variable in group.items"
                                        :key="variable.token"
                                        type="button"
                                        class="cursor-pointer text-left border border-primary-200 bg-white hover:bg-primary-100 px-3 py-2 text-sm"
                                        :title="`${variable.help} Inserta: ${variable.token}`"
                                        @click="appendDocumentVariable(variable.token)"
                                    >
                                        <span class="block text-primary-900 font-semibold">{{ variable.label }}</span>
                                        <small class="block text-gray-500">{{ variable.token }}</small>
                                    </button>
                                </div>
                            </article>
                        </div>
                        <p v-if="filteredDocumentVariableGroups.length === 0" class="m-0 mt-3 text-gray-500 text-sm">No encontramos datos con esa búsqueda.</p>
                    </div>

                    <div v-if="unknownDocumentVariables.length > 0" class="mt-4 border border-red-200 bg-red-50 text-red-700 p-4">
                        <p class="m-0 font-semibold">Encontramos datos automáticos que el sistema no reconoce.</p>
                        <ul class="m-0 mt-2 pl-5">
                            <li v-for="item in unknownDocumentVariables" :key="item">{{ item }}</li>
                        </ul>
                        <p class="m-0 mt-2 text-sm">Corrígelos o insértalos usando la lista de datos automáticos.</p>
                    </div>

                    <div v-if="false" class="mt-4 border border-gray-200 bg-white p-4">
                        <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Vista previa con datos de ejemplo</p>
                        <p class="m-0 mt-1 mb-4 text-gray-500 text-sm">Esta vista previa usa datos de ejemplo. Al generar el documento se usarán los datos reales del paciente.</p>
                        <div class="border border-gray-200 p-5 bg-gray-50 leading-relaxed" v-html="documentTemplatePreview"></div>
                    </div>
                    </fieldset>
                </v-card-text>
                <v-card-actions class="px-6 pb-5 justify-end gap-3">
                    <da-button-secondary :disabled="documentTemplateSaving" @click.native="onCancelDocumentTemplate()" :label="'Cancelar'" rxl swpr class="py-1 px-4 font-light"></da-button-secondary>
                    <p v-if="$route.query.guide === '1'" role="note">Revisa contenido, firmas requeridas y Plantilla activa. Guardar crea una versión; todavía no hay un documento firmado por un paciente.</p>
                    <da-button-primary ref="guideDocumentSave" @click.native="saveDocumentTemplate()" :disabled="documentTemplateSaving" :label="documentTemplateSaving ? 'Guardando...' : documentTemplateSaveLabel" rxl swpr class="py-1 px-4 font-light"></da-button-primary>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-if="activeSection === 'documents'" v-model="confirmExampleDialog" max-width="520">
            <v-card>
                <div class="px-6 py-5 border-b border-gray-200 bg-primary-100">
                    <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Insertar ejemplo</p>
                    <h3 class="m-0 mt-1 text-gray-700 text-xl font-semibold">Reemplazar contenido actual</h3>
                </div>
                <v-card-text class="pt-5">
                    <p class="m-0 text-gray-600">Esto reemplazará el contenido actual con un ejemplo. ¿Deseas continuar?</p>
                </v-card-text>
                <v-card-actions class="px-6 pb-5 justify-end gap-3">
                    <da-button-secondary @click.native="confirmExampleDialog = false" :label="'Cancelar'" rxl swpr class="py-1 px-4 font-light"></da-button-secondary>
                    <da-button-primary @click.native="insertDocumentExample()" :label="'Insertar ejemplo'" rxl swpr class="py-1 px-4 font-light"></da-button-primary>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-if="activeSection === 'documents'" v-model="automaticDataHelpDialog" scrollable max-width="760" role="dialog" aria-modal="true" aria-labelledby="automatic-data-help-title">
            <v-card>
                <div class="px-6 py-5 border-b border-gray-200 bg-primary-100">
                    <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Ayuda</p>
                    <h3 id="automatic-data-help-title" class="m-0 mt-1 text-gray-700 text-xl font-semibold">Datos automáticos disponibles</h3>
                    <p class="m-0 mt-2 text-gray-500 text-sm">El sistema los llena con información real al crear documentos para un paciente.</p>
                </div>
                <v-card-text class="pt-5 settings-dialog-scroll">
                    <v-text-field v-model="documentVariableSearch" label="Buscar dato automático" dense outlined hide-details :color="themePrimaryColor" class="mb-4"></v-text-field>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <article v-for="group in filteredDocumentVariableGroups" :key="group.title" class="border border-gray-200 bg-gray-50 p-4">
                            <p class="m-0 mb-2 text-gray-700 font-semibold">{{ group.title }}</p>
                            <div v-for="variable in group.items" :key="variable.token" class="mb-3 last:mb-0">
                                <p class="m-0 text-primary-900 font-semibold">{{ variable.label }}</p>
                                <p class="m-0 text-gray-500 text-xs">{{ variable.help }}</p>
                                <code class="text-xs text-gray-500">{{ variable.token }}</code>
                            </div>
                        </article>
                    </div>
                    <p v-if="filteredDocumentVariableGroups.length === 0" class="m-0 text-gray-500 text-sm">No encontramos datos con esa búsqueda.</p>
                </v-card-text>
                <v-card-actions class="px-6 pb-5 justify-end">
                    <da-button-primary @click.native="automaticDataHelpDialog = false" :label="'Entendido'" rxl swpr class="py-1 px-4 font-light"></da-button-primary>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script>
import PreparationGuide from './components/PreparationGuide.vue';
import { focusControl } from '../../domain/onboarding/focusControl';
import { mapActions, mapGetters } from 'vuex';
import ProfessionalAgendaConfig from './components/ProfessionalAgendaConfig.vue';
import AccountLegalDocuments from './components/AccountLegalDocuments.vue';
import ChangePassword from './components/ChangePassword.vue';
import { getSettingsSections } from '../../security/settingsAccess';
import VuexMixin from '../../mixins/VuexMixin';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import { resizeImage } from '../../utils/file';
import { sanitizeHtmlForDocumentSnapshot } from '../../utils/sanitizeHtml';
import { DEFAULT_THEME, applyTheme, restoreThemePreview, themeState, getThemeContext } from '../../plugins/theme';
import { confirmSettingsDiscard, registerSettingsNavigationGuard } from '../../domain/settings/settings.navigation';
import { authorizationContext, isCurrentAuthorization } from '../../security/authorizationContext';
import { validateBusinessProfile } from '../../domain/settings/business.validation';
import { setStoredLoginLogo } from '../../utils/branding';
import { DAAppointmentService, DAPrescriptionService, DAUserService, DABusinessService, DADocumentService } from '../../services/context/core-proccess-context';
import { buildLicenseLimitMessage } from '../../utils/licenseLimitMessage';
import PrescriptionConfig from './components/PrescriptionConfig.vue';
import AdminSummary from './components/AdminSummary.vue';
import ClinicalHistoryTemplateConfig from './components/ClinicalHistoryTemplateConfig.vue';
import RolesPermissionsConfig from './components/RolesPermissionsConfig.vue';
import DAProfessionalProfile from '../User/components/DAProfessionalProfile.vue';
import {
    WEEK_DAYS,
    createId,
    getAppointmentConfig,
    normalizeAppointmentConfig,
    saveAppointmentConfig
} from '../../domain/appointments/appointment.storage';
import {
    generateDaySlots,
    getDayWorkingConfig,
    getHourBlocksForDate,
    isDateBlocked,
    timeToMinutes,
    toIsoDate
} from '../../domain/appointments/availability';

export default {
    mixins:[VuexMixin],
    components: {
        PreparationGuide,
        AccountLegalDocuments,
        ChangePassword,
        ProfessionalAgendaConfig,
        PrescriptionConfig,
        AdminSummary,
        ClinicalHistoryTemplateConfig,
        RolesPermissionsConfig,
        'da-professional-profile': DAProfessionalProfile
    },
    props: {
        activeSection: {
            type: String,
            default: 'summary'
        }
    },
    data: function() {
        return {
            consentimiento: '',
            declaracion: '',
            nombredr: '',
            id_signature_consent: '',
            key_signature: '',
            newSignature: '',
            url_signature:'',
            idsignatunature:'',
            updateSignature: false,
            isModify: true,
            loginImagePreview: '',
            loginImageFileName: '',
            loginImageError: '',
            loginImageInputKey: 0,
            loginImageOriginal: '',
            loginImageOriginalName: '',
            loginImageSaving: false,
            loginImageProcessing: false,
            appearanceLoading: false,
            appearanceError: '',
            savedTheme: null,
            savedThemeContext: '',
            disposed: false,
            selectedThemeCode: DEFAULT_THEME.code,
            isThemeSaving: false,
            businessInfo: {
                id_business: '',
                name: '',
                legalName: '',
                slug: '',
                email: '',
                phone: '',
                address: '',
                logoUrl: '',
                status: '',
                subscriptionStatus: '',
                trialStartsAt: '',
                trialEndsAt: '',
                currentPeriodStartsAt: '',
                currentPeriodEndsAt: '',
                plan: ''
            },
            businessInfoOriginal: null,
            pendingBusinessSave:null, pendingDocumentSave:null,
            businessInfoEditing: false,
            businessInfoSaving: false,
            businessInfoLoading: false,
            businessInfoError: '',
            businessFieldErrors: {},
            businessSaveError: '',
            clinicalModulesLoading: false,
            clinicalModulesError: '',
            clinicalModulesSaving: false,
            clinicalModulesOriginal: null,
            prescriptionConfigStatus: null,
            professionalProfileStatus: null,
            signatureImageError: false,
            clinicalModulesForm: {
                odontogramEnabled: false,
                treatmentPlanEnabled: true,
                allowTreatmentToothSelection: false,
                showTreatmentCosts: true,
                showTreatmentStatus: true
            },
            appointmentConfig: getAppointmentConfig(),
            agendaTab: 0,
            dayDialog: false,
            editingDay: {
                dayOfWeek: 1,
                enabled: true,
                timeRanges: []
            },
            editingDayError: '',
            copyDialog: false,
            copySourceDay: {},
            copyTargetDays: [],
            blockDialog: false,
            blockMode: 'date',
            editingBlock: {},
            blockError: '',
            previewDate: toIsoDate(new Date()),
            appointmentDurationOptions: [
                { text: '15 minutos', value: 15 },
                { text: '30 minutos', value: 30 },
                { text: '45 minutos', value: 45 },
                { text: '60 minutos', value: 60 }
            ],
            weekDays: WEEK_DAYS,
            newBlockedDate: {
                date: '',
                reason: '',
                repeats: false
            },
            newBlockedHour: {
                date: '',
                dayOfWeek: 1,
                startTime: '13:00',
                endTime: '14:00',
                reason: '',
                repeats: false
            },
            documentTemplates: [],
            documentTemplateDialog: false,
            documentTemplateOriginal: '',
            documentTemplateSaving: false,
            documentTemplateErrors: {},
            documentTemplateSaveError: '',
            documentTemplatesLoading: false,
            documentTemplatesError: '',
            documentTemplateForm: {
                id_document_template: '',
                template_type: 'CUSTOM_DOCUMENT',
                name: '',
                description: '',
                content_html: '',
                content_text: '',
                requires_patient_signature: true,
                requires_tutor_signature: false,
                requires_doctor_signature: true,
                requires_witness1_signature: false,
                requires_witness2_signature: false,
                is_active: true,
                advanced_mode: false,
                document_license_tier: 'basic'
            },
            showDocumentPreview: false,
            documentContentMode: 'edit',
            confirmExampleDialog: false,
            automaticDataHelpDialog: false,
            documentVariableSearch: '',
            documentTemplateTypeOptions: [
                { label: 'Consentimiento del plan de tratamiento', value: 'TREATMENT_PLAN_CONSENT' },
                { label: 'Consentimiento de datos personales sensibles', value: 'SENSITIVE_DATA_CONSENT' },
                { label: 'Consentimiento general de atención', value: 'GENERAL_ATTENTION_CONSENT' },
                { label: 'Documento personalizado', value: 'CUSTOM_DOCUMENT' }
            ],
            documentLicenseTierOptions: [
                { label: 'Basica', value: 'basic' },
                { label: 'Clinica/legal', value: 'clinical_legal' },
                { label: 'Con apoyo de soporte', value: 'advanced', lockedPlan: 'Profesional' },
                { label: 'Premium', value: 'premium', lockedPlan: 'Clinica' },
                { label: 'Requiere revision', value: 'review' }
            ],
            documentVariableGroups: [
                {
                    title: 'Datos del paciente',
                    items: [
                        { label: 'Nombre del paciente', token: '{{nombrePaciente}}', help: 'Se reemplaza por el nombre completo del paciente seleccionado.' },
                        { label: 'Edad del paciente', token: '{{edadPaciente}}', help: 'Se reemplaza por la edad registrada del paciente.' },
                        { label: 'Fecha de nacimiento', token: '{{fechaNacimientoPaciente}}', help: 'Se reemplaza por la fecha de nacimiento del paciente.' }
                    ]
                },
                {
                    title: 'Datos del doctor',
                    items: [
                        { label: 'Nombre del doctor', token: '{{nombreDoctor}}', help: 'Se reemplaza por el nombre profesional del doctor responsable.' },
                        { label: 'Cédula profesional', token: '{{cedulaDoctor}}', help: 'Se reemplaza por la cédula profesional del doctor responsable.' },
                        { label: 'Especialidad', token: '{{especialidadDoctor}}', help: 'Se reemplaza por la especialidad del doctor responsable.' },
                        { label: 'Cédula de especialidad', token: '{{cedulaEspecialidadDoctor}}', help: 'Se reemplaza por la cédula de especialidad, si existe.' },
                        { label: 'Universidad', token: '{{universidadDoctor}}', help: 'Se reemplaza por la universidad registrada en el perfil profesional.' }
                    ]
                },
                {
                    title: 'Datos del consultorio',
                    items: [
                        { label: 'Nombre del consultorio', token: '{{nombreConsultorio}}', help: 'Se reemplaza por el nombre del consultorio o clínica.' },
                        { label: 'Nombre comercial', token: '{{nombreBusiness}}', help: 'Se reemplaza por el nombre comercial del consultorio o empresa.' }
                    ]
                },
                {
                    title: 'Datos del documento',
                    items: [
                        { label: 'Fecha actual', token: '{{fechaActual}}', help: 'Se reemplaza por la fecha en que se genera el documento.' },
                        { label: 'Diagnóstico', token: '{{diagnostico}}', help: 'Se reemplaza por el diagnóstico disponible, si existe.' },
                        { label: 'Plan de tratamiento', token: '{{planTratamiento}}', help: 'Se reemplaza por el texto del plan de tratamiento activo, si existe.' }
                    ]
                },
                {
                    title: 'Tutor o representante',
                    items: [
                        { label: 'Nombre del tutor', token: '{{nombreTutor}}', help: 'Se usa cuando firma un tutor o representante legal.' },
                        { label: 'Parentesco del tutor', token: '{{parentescoTutor}}', help: 'Se reemplaza por el parentesco o relación con el paciente.' }
                    ]
                }
            ]
        }
    },
    created() {
        this.removeSettingsGuard = registerSettingsNavigationGuard(this, {
            hasChanges: () => this.hasUnsavedChanges,
            isSaving: () => this.settingsSaving,
            onDiscard: () => this.discardSettingsChanges()
        })
        this.init()
    },
    beforeDestroy() {
        this.disposed = true
        if(this.removeSettingsGuard) this.removeSettingsGuard()
        this.restoreAppearancePreview()
    },
    computed: {
        businessInfoDirty() { return this.businessInfoEditing && JSON.stringify(this.businessInfo) !== JSON.stringify(this.businessInfoOriginal) },
        clinicalModulesDirty() { return this.clinicalModulesOriginal !== null && JSON.stringify(this.clinicalModulesForm) !== this.clinicalModulesOriginal },
        appearanceDirty() { return Boolean(this.savedTheme && this.selectedThemeCode !== this.savedTheme.code) || this.loginImagePreview !== this.loginImageOriginal },
        documentTemplateDirty() { return this.documentTemplateDialog && JSON.stringify(this.documentTemplateForm) !== this.documentTemplateOriginal },
        hasUnsavedChanges() { return this.businessInfoDirty || this.clinicalModulesDirty || this.appearanceDirty || this.documentTemplateDirty },
        settingsSaving() { return this.businessInfoSaving || this.clinicalModulesSaving || this.isThemeSaving || this.loginImageSaving || this.loginImageProcessing || this.documentTemplateSaving },
        ...mapGetters(moduleTypes.CONFIGURATION, {
            getConfigurations:      fnTypes.getConfiguration,
            hasErrorConfiguration:  fnTypes.hasErrorInService,
            getLoginImageData:      fnTypes.getLoginImage,
            themeList:              fnTypes.getThemeList,
            clinicalModules:        fnTypes.clinicalModules
        }),
        ...mapGetters(moduleTypes.AUTH, {
            authUser: fnTypes.getUser,
            authBusiness: fnTypes.getBusiness,
            role: fnTypes.getRole,
            hasPermission: fnTypes.hasPermission
        }),
        sectionAllowed() { return getSettingsSections(this.role,this.hasPermission).some(section=>section.key===this.activeSection) },
        activeTheme() { return themeState.currentTheme },

        loginImagePreviewStyle: function() {
            return this.loginImagePreview ? `background-image: url('${this.loginImagePreview}')` : '';
        },

        editConfigLabel: function() {
            return this.activeSection === 'documents' ? 'Editar documentos' : 'Modificar firma'
        },

        saveConfigLabel: function() {
            return this.activeSection === 'documents' ? 'Guardar documentos' : 'Guardar identidad'
        },

        hasSignaturePreview: function() {
            return Boolean(this.url_signature && !this.signatureImageError)
        },

        orderedWorkingDays: function() {
            return this.weekDays
                .map((day) => this.appointmentConfig.workingDays.find((item) => Number(item.dayOfWeek) === Number(day.value)))
                .filter((day) => day);
        },

        themePrimaryColor: function() {
            return 'var(--color-primary-700)'
        },

        businessPlanLabel: function() {
            return ({ basic: 'Individual', pro: 'Profesional', professional: 'Profesional', enterprise: 'Clínica' })[String(this.businessInfo.plan || '').toLowerCase()] || 'Sin plan identificado'
        },

        businessStatusLabel: function() {
            const rawStatus = this.businessInfo && (this.businessInfo.subscriptionStatus || this.businessInfo.status)
                ? String(this.businessInfo.subscriptionStatus || this.businessInfo.status).toLowerCase()
                : ''

            const statusLabels = {
                active: 'Activa',
                inactive: 'Inactiva',
                enabled: 'Activa',
                disabled: 'Inactiva',
                trialing: 'En periodo de prueba',
                trial: 'En periodo de prueba',
                pending: 'Pendiente',
                suspended: 'Suspendida',
                cancelled: 'Cancelada',
                canceled: 'Cancelada',
                expired: 'Vencida',
                past_due: 'Pago pendiente',
                unpaid: 'Pago pendiente'
            }

            if(statusLabels[rawStatus]) {
                return statusLabels[rawStatus]
            }

            if(rawStatus) {
                return rawStatus
                    .split(/[_\s-]+/)
                    .filter((word) => word)
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')
            }

            return 'Sin estado'
        },

        appointmentSummary: function() {
            const activeDays = this.orderedWorkingDays.filter((day) => day.enabled)
            const totalRanges = activeDays.reduce((total, day) => total + (day.timeRanges || []).length, 0)
            const activeBlocks = (this.appointmentConfig.blockedDates || []).length + (this.appointmentConfig.blockedHours || []).length

            return [
                { label: 'Dias activos', value: activeDays.length, detail: 'de 7 dias configurados' },
                { label: 'Duracion', value: `${this.appointmentConfig.defaultAppointmentDuration || 30} min`, detail: 'por cita' },
                { label: 'Rangos', value: totalRanges, detail: 'horarios semanales' },
                { label: 'Bloqueos', value: activeBlocks, detail: 'activos' }
            ]
        },

        copyTargetOptions: function() {
            return this.weekDays.filter((day) => Number(day.value) !== Number(this.copySourceDay.dayOfWeek))
        },

        blockItems: function() {
            const dates = (this.appointmentConfig.blockedDates || []).map((block) => ({
                key: `date-${block.id}`,
                type: 'date',
                raw: block,
                title: block.repeats ? this.dayName(block.dayOfWeek) : block.date,
                subtitle: `Dia completo${block.repeats ? ' · Repite semanalmente' : ''}`,
                reason: block.reason || 'Sin motivo'
            }))
            const hours = (this.appointmentConfig.blockedHours || []).map((block) => ({
                key: `hour-${block.id}`,
                type: 'hour',
                raw: block,
                title: block.repeats ? this.dayName(block.dayOfWeek) : block.date,
                subtitle: `${block.startTime} - ${block.endTime}${block.repeats ? ' · Repite semanalmente' : ''}`,
                reason: block.reason || 'Sin motivo'
            }))

            return [...dates, ...hours]
        },

        previewWorkingDay: function() {
            return getDayWorkingConfig(this.appointmentConfig, this.previewDate)
        },

        previewWorkingRanges: function() {
            return this.previewWorkingDay && this.previewWorkingDay.enabled ? (this.previewWorkingDay.timeRanges || []) : []
        },

        previewDayName: function() {
            return this.dayName(new Date(`${this.previewDate}T00:00:00`).getDay())
        },

        previewIsBlockedDate: function() {
            return isDateBlocked(this.appointmentConfig, this.previewDate)
        },

        previewAvailableSlots: function() {
            return generateDaySlots(this.previewDate, this.appointmentConfig, []).filter((slot) => slot.selectable)
        },

        previewBlockedHours: function() {
            return getHourBlocksForDate(this.appointmentConfig, this.previewDate)
        },

        configurationSummary: function() {
            const hasLogo = Boolean(this.loginImagePreview)
            const theme = this.activeTheme && this.activeTheme.name ? this.activeTheme.name : this.selectedThemeCode
            const odontogramActive = Boolean(this.clinicalModulesForm && this.clinicalModulesForm.odontogramEnabled)

            return [
                {
                    label: 'Logo',
                    path: '/admin?section=appearance',
                    value: hasLogo ? 'Configurado' : 'Predeterminado',
                    detail: this.loginImageFileName || 'Se usa el logo predeterminado',
                    statusClass: hasLogo ? 'bg-green-500' : 'bg-gray-400'
                },
                {
                    label: 'Tema',
                    path: '/admin?section=appearance',
                    value: theme || 'Predeterminado',
                    detail: 'Paleta visual activa',
                    statusClass: 'bg-green-500'
                },
                {
                    label: 'Odontograma',
                    path: '/admin?section=clinical-modules',
                    value: odontogramActive ? 'Activo' : 'Oculto',
                    detail: 'Apartado del expediente del paciente',
                    statusClass: odontogramActive ? 'bg-green-500' : 'bg-gray-400'
                }
            ].map(item => {
                const appearance = item.label !== 'Odontograma'
                const known = appearance ? Boolean(this.savedTheme) && !this.appearanceLoading && !this.appearanceError : this.clinicalModulesOriginal !== null && !this.clinicalModulesLoading && !this.clinicalModulesError
                if(known) return item
                return { ...item, value: (appearance ? this.appearanceError : this.clinicalModulesError) ? 'No disponible' : 'Consultando…', detail: 'Abre el apartado para consultar su configuración guardada.', statusClass: 'bg-gray-400' }
            })
        },

        knownDocumentVariables: function() {
            return this.documentVariableGroups.reduce((acc, group) => {
                group.items.forEach((item) => acc.push(item.token))
                return acc
            }, [])
        },

        activeDocumentContentModel: {
            get: function() {
                return this.documentTemplateForm.advanced_mode ? this.documentTemplateForm.content_html : this.documentTemplateForm.content_text
            },
            set: function(value) {
                if(this.documentTemplateForm.advanced_mode) {
                    this.documentTemplateForm.content_html = value
                    return
                }
                this.documentTemplateForm.content_text = value
            }
        },

        documentTemplateContentForSave: function() {
            if(this.documentTemplateForm.advanced_mode) {
                return this.documentTemplateForm.content_html || ''
            }
            return this.plainTextToHtml(this.documentTemplateForm.content_text || '')
        },

        documentTemplateSaveLabel: function() {
            return this.documentTemplateForm.id_document_template ? 'Guardar nueva versión' : 'Crear plantilla'
        },

        currentPlanCode: function() {
            return String(this.authBusiness && this.authBusiness.plan ? this.authBusiness.plan : '').toLowerCase()
        },

        documentLicenseTierOptionsForPlan: function() {
            return this.documentLicenseTierOptions.map((item) => ({
                ...item,
                label: item.lockedPlan && this.isDocumentTierLocked(item.value)
                    ? `${item.label} - Disponible en ${item.lockedPlan}`
                    : item.label,
                disabled: this.isDocumentTierLocked(item.value)
            }))
        },

        selectedDocumentTierLocked: function() {
            const tier = this.documentTemplateForm.document_license_tier
            if(!this.isDocumentTierLocked(tier)) {
                return null
            }
            if(tier === 'premium') {
                return {
                    title: 'Disponible en Clinica',
                    message: 'Las plantillas documentales premium estan disponibles en el plan Clinica.'
                }
            }
            if(tier === 'advanced') {
                return {
                    title: 'Disponible en Profesional',
                    message: 'Los formatos personalizados con apoyo de soporte estan disponibles desde el plan Profesional.'
                }
            }
            return null
        },

        filteredDocumentVariableGroups: function() {
            const search = (this.documentVariableSearch || '').toLowerCase().trim()
            if(!search) {
                return this.documentVariableGroups
            }
            return this.documentVariableGroups
                .map((group) => ({
                    title: group.title,
                    items: group.items.filter((item) => {
                        return `${item.label} ${item.token} ${item.help}`.toLowerCase().includes(search)
                    })
                }))
                .filter((group) => group.items.length > 0)
        },

        unknownDocumentVariables: function() {
            const content = this.documentTemplateContentForSave || ''
            const matches = content.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || []
            const normalizedKnown = this.knownDocumentVariables.map((item) => item.replace(/\s/g, ''))
            return [...new Set(matches)]
                .map((item) => item.replace(/\s+/g, ''))
                .filter((item) => !normalizedKnown.includes(item))
        },

        documentTemplatePreview: function() {
            const examples = {
                nombrePaciente: 'Emili Robles',
                edadPaciente: '28 años',
                fechaNacimientoPaciente: '15/04/1998',
                nombreDoctor: 'Eduardo Méndez',
                cedulaDoctor: '1239874',
                especialidadDoctor: 'Medicina general',
                cedulaEspecialidadDoctor: 'No especificado',
                universidadDoctor: 'UNACH',
                nombreConsultorio: 'Bright Smile Dental Care',
                nombreBusiness: 'Bright Smile Dental Care',
                fechaActual: '28/05/2026',
                diagnostico: 'Valoración clínica inicial',
                planTratamiento: 'Limpieza, revisión y seguimiento clínico',
                nombreTutor: 'María Juárez López',
                parentescoTutor: 'Madre'
            }
            return sanitizeHtmlForDocumentSnapshot(String(this.documentTemplateContentForSave || '')
                .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => examples[key] || 'No especificado'))
        }
    },
    methods: {
        async reconcileBusinessSave(context) {
            const response=await DABusinessService.getCurrent();
            if(this.disposed || !isCurrentAuthorization(context,this.$store))return;
            if(!response || !response.success)throw Error();
            const expected=this.pendingBusinessSave;
            if(Object.keys(expected).every(key=>String(response.data[key] || '').trim()===String(expected[key] || '').trim())){
                this.businessInfoOriginal=this.cloneBusinessInfo({...this.businessInfoOriginal,...response.data});this.pendingBusinessSave=null;this.businessSaveError='Guardado comprobado. Los cambios posteriores permanecen en la pantalla.';
            }else this.businessSaveError='No coincide con lo enviado. Conservamos tu captura; revisa los datos guardados antes de reemplazarlos. No enviamos otro guardado.';
        },
        async reconcileDocumentSave(context) {
            const response=await DADocumentService.getTemplates();
            if(this.disposed || !isCurrentAuthorization(context,this.$store))return;
            if(!response || !response.success)throw Error();
            const expected=this.pendingDocumentSave;
            const matches=(response.data || []).filter(row=>(!expected.id_document_template || row.id_document_template===expected.id_document_template) && ['name','template_type','content_html','description'].every(key=>String(row[key] || '')===String(expected[key] || '')) && ['is_active','requires_patient_signature','requires_tutor_signature','requires_doctor_signature','requires_witness1_signature','requires_witness2_signature'].every(key=>Boolean(Number(row[key]))===Boolean(expected[key])));
            this.documentTemplates=response.data || [];
            if(matches.length===1){this.documentTemplateForm.id_document_template=matches[0].id_document_template;this.pendingDocumentSave=null;this.documentTemplateSaveError='Encontramos el formato guardado. Revisa el listado antes de crear otra versión.';}
            else this.documentTemplateSaveError='No pudimos identificar una única versión guardada. Conservamos tu captura y no enviamos otro guardado. Revisa el listado antes de continuar.';
        },
        focusPreparationControl(id, reveal) { const refs=this.activeSection==='identity' ? (this.businessInfoEditing ? {identity:'business_name',phone:'business_phone',address:'business_address',save:'guideIdentityAction'} : {identity:'guideIdentityAction',save:'guideIdentityAction'}) : this.documentTemplateDialog ? {documents:'documentTemplateName',type:'guideDocumentType',content:'documentContentInput',signatures:'guideDocumentSignatures',active:'guideDocumentActive',save:'guideDocumentSave'} : {documents:'guideDocumentsAction'};focusControl(this.$refs[refs[id]], reveal); },
        ...mapActions(moduleTypes.CONFIGURATION, [
            fnTypes.saveConfiguration,
            fnTypes.editConfiguration,
            fnTypes.getConfiguration,
            fnTypes.saveLoginImage,
            fnTypes.getLoginImage,
            fnTypes.getThemeList,
            fnTypes.getTheme,
            fnTypes.saveTheme,
            fnTypes.getClinicalModules,
            fnTypes.saveClinicalModules
        ]),

        init: async function() {
            if(!this.sectionAllowed) return
            const section=this.activeSection
            if(section==='documents') await this.onGetConfiguration()
            if(section==='identity') await this.onGetBusinessInfo()
            if(['summary','appearance'].includes(section)) await this.onLoadAppearance()
            if(['summary','clinical-modules'].includes(section)) await this.onLoadClinicalModules()
            if(section==='documents' && this.hasPermission('documents.config')) await this.onGetDocumentTemplates()
        },

        discardSettingsChanges() {
            if(this.businessInfoOriginal) this.businessInfo = this.cloneBusinessInfo(this.businessInfoOriginal)
            this.businessInfoEditing = false
            if(this.clinicalModulesOriginal) this.clinicalModulesForm = JSON.parse(this.clinicalModulesOriginal)
            this.documentTemplateDialog = false
            this.restoreAppearancePreview()
            this.loginImagePreview = this.loginImageOriginal
            this.loginImageFileName = this.loginImageOriginalName
        },
        restoreAppearancePreview() {
            if(this.savedTheme && getThemeContext(this.$store.state.CORE.AUTH) === this.savedThemeContext && themeState.hasPreview) {
                restoreThemePreview(this.savedTheme)
                this.selectedThemeCode = this.savedTheme.code
            }
        },
        formatBusinessDate(value) {
            if(!value) return 'Sin periodo de prueba'
            const date = new Date(value)
            return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : 'Hasta ' + new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date) + ' (hora del centro de México)'
        },
        focusInvalid(refs) {
            this.$nextTick(() => {
                const field = refs.map(name => this.$refs[name]).find(Boolean)
                if(field && typeof field.focus === 'function') field.focus()
                else if(field && field.$el) { const input = field.$el.querySelector('input,textarea'); if(input) input.focus() }
            })
        },
        settingsReadStillCurrent(context, errorField) {
            if(this.disposed) return false
            if(isCurrentAuthorization(context, this.$store)) return true
            this[errorField] = 'La sesión o tus accesos cambiaron durante la consulta. Reintenta para ver la configuración actual.'
            return false
        },
        async onLoadAppearance() {
            if(this.appearanceLoading || this.appearanceDirty) return
            const context = authorizationContext(this.$store)
            this.appearanceLoading = true
            this.appearanceError = ''
            try {
                const results = await Promise.all([this.getLoginImage(), this.getThemeList(), this.getTheme({ force: true })])
                if(!this.settingsReadStillCurrent(context, 'appearanceError')) return
                if(results.some(result => !result || !result.success)) throw new Error('read')
                this.loginImagePreview = (this.getLoginImageData || {}).image_data || ''
                this.loginImageFileName = (this.getLoginImageData || {}).original_name || ''
                this.loginImageOriginal = this.loginImagePreview
                this.loginImageOriginalName = this.loginImageFileName
                this.savedTheme = { ...this.activeTheme }
                this.savedThemeContext = getThemeContext(this.$store.state.CORE.AUTH)
                this.ensureSelectedTheme()
            } catch(_) { if(isCurrentAuthorization(context, this.$store)) this.appearanceError = 'No se pudo cargar la apariencia guardada. Reintenta antes de hacer cambios.' }
            finally { this.appearanceLoading = false }
        },
        async onLoadClinicalModules() {
            if(this.clinicalModulesLoading || this.clinicalModulesDirty) return
            const context = authorizationContext(this.$store)
            this.clinicalModulesLoading = true
            this.clinicalModulesError = ''
            try {
                const response = await this.getClinicalModules()
                if(!this.settingsReadStillCurrent(context, 'clinicalModulesError')) return
                if(!response || !response.success) throw new Error('read')
                this.applyClinicalModules()
                this.clinicalModulesOriginal = JSON.stringify(this.clinicalModulesForm)
            } catch(_) { if(isCurrentAuthorization(context, this.$store)) this.clinicalModulesError = 'No se pudieron cargar las secciones guardadas. Reintenta antes de modificarlas.' }
            finally { this.clinicalModulesLoading = false }
        },

        isDocumentTierLocked: function(tier) {
            if(tier === 'premium') {
                return this.currentPlanCode !== 'enterprise'
            }
            if(tier === 'advanced') {
                return !['pro', 'enterprise'].includes(this.currentPlanCode)
            }
            return false
        },

        documentTemplateTierFromMetadata: function(template) {
            if(!template) {
                return 'basic'
            }
            if(template.licensing_review_required === 1 || template.license_category === 'unknown' || template.template_subtype === 'unknown') {
                return 'review'
            }
            if(template.is_premium === 1 || template.license_category === 'premium_document_template' || template.license_category === 'premium_consent_template') {
                return 'premium'
            }
            if(template.license_category === 'advanced_document' || template.license_category === 'advanced_consent' || template.template_subtype === 'custom_advanced') {
                return 'advanced'
            }
            if(template.clinical_legal_safe === 1 || template.license_category === 'mandatory_consent' || template.license_category === 'clinical_legal') {
                return 'clinical_legal'
            }
            return 'basic'
        },

        documentTemplateLicenseLabel: function(template) {
            const tier = this.documentTemplateTierFromMetadata(template)
            const found = this.documentLicenseTierOptions.find((item) => item.value === tier)
            return found ? found.label : 'Basica'
        },

        documentTemplateLicenseMetadata: function(tier) {
            const map = {
                basic: {
                    license_category: 'custom_basic',
                    template_subtype: 'custom_basic',
                    is_premium: false,
                    clinical_legal_safe: false,
                    minimum_plan: 'basic',
                    block_mode: 'never'
                },
                clinical_legal: {
                    license_category: 'clinical_legal',
                    template_subtype: 'custom_clinical',
                    is_premium: false,
                    clinical_legal_safe: true,
                    minimum_plan: 'basic',
                    block_mode: 'never'
                },
                advanced: {
                    license_category: 'advanced_document',
                    template_subtype: 'custom_advanced',
                    is_premium: false,
                    clinical_legal_safe: false,
                    minimum_plan: 'pro',
                    block_mode: 'block_on_create'
                },
                premium: {
                    license_category: 'premium_document_template',
                    template_subtype: 'custom_premium',
                    is_premium: true,
                    clinical_legal_safe: false,
                    minimum_plan: 'enterprise',
                    block_mode: 'block_on_create'
                },
                review: {
                    license_category: 'unknown',
                    template_subtype: 'unknown',
                    is_premium: false,
                    clinical_legal_safe: false,
                    minimum_plan: 'basic',
                    block_mode: 'requires_redesign'
                }
            }
            return map[tier] || map.basic
        },

        emptyDocumentTemplateForm: function() {
            return {
                id_document_template: '',
                template_type: 'CUSTOM_DOCUMENT',
                name: '',
                description: '',
                content_html: '',
                content_text: '',
                requires_patient_signature: true,
                requires_tutor_signature: false,
                requires_doctor_signature: true,
                requires_witness1_signature: false,
                requires_witness2_signature: false,
                is_active: true,
                advanced_mode: false,
                document_license_tier: 'basic'
            }
        },

        onGetDocumentTemplates: async function() {
            if(this.documentTemplatesLoading) return
            const context = authorizationContext(this.$store)
            this.documentTemplatesLoading = true
            this.documentTemplatesError = ''
            try {
                const response = await DADocumentService.getTemplates()
                if(!this.settingsReadStillCurrent(context, 'documentTemplatesError')) return
                if(!response || !response.success) throw new Error('read')
                this.documentTemplates = response.data || []
            } catch(_) { if(isCurrentAuthorization(context, this.$store)) this.documentTemplatesError = 'No se pudieron cargar las plantillas. Reintenta para ver la lista actual.' }
            finally { this.documentTemplatesLoading = false }
        },

        openDocumentTemplateDialog: function(template) {
            if(this.pendingDocumentSave){this.documentTemplateDialog=true;this.documentTemplateSaveError='Primero comprueba el guardado anterior. Conservamos la captura de ese formato para evitar crear una versión duplicada.';return}
            if(template) {
                const contentHtml = template.content_html || ''
                this.documentTemplateForm = {
                    id_document_template: template.id_document_template || '',
                    template_type: template.template_type || 'CUSTOM_DOCUMENT',
                    name: template.name || '',
                    description: template.description || '',
                    content_html: contentHtml,
                    content_text: this.htmlToPlainText(contentHtml),
                    requires_patient_signature: template.requires_patient_signature !== 0,
                    requires_tutor_signature: template.requires_tutor_signature === 1,
                    requires_doctor_signature: template.requires_doctor_signature !== 0,
                    requires_witness1_signature: template.requires_witness1_signature === 1,
                    requires_witness2_signature: template.requires_witness2_signature === 1,
                    is_active: template.is_active !== 0,
                    advanced_mode: false,
                    document_license_tier: this.documentTemplateTierFromMetadata(template)
                }
            } else {
                this.documentTemplateForm = this.emptyDocumentTemplateForm()
            }
            this.showDocumentPreview = false
            this.documentContentMode = 'edit'
            this.confirmExampleDialog = false
            this.documentVariableSearch = ''
            this.documentTemplateErrors = {}
            this.documentTemplateSaveError = ''
            this.documentTemplateOriginal = JSON.stringify(this.documentTemplateForm)
            this.documentTemplateDialog = true
        },

        async onCancelDocumentTemplate() {
            if(this.documentTemplateSaving) return
            if(this.documentTemplateDirty && !await confirmSettingsDiscard(this)) return
            this.documentTemplateDialog = false
        },

        saveDocumentTemplate: async function() {
            if(this.documentTemplateSaving) return
            const context=authorizationContext(this.$store)
            if(this.pendingDocumentSave){this.documentTemplateSaving=true;try{await this.reconcileDocumentSave(context)}catch(_){if(isCurrentAuthorization(context,this.$store))this.documentTemplateSaveError='No pudimos comprobar el guardado anterior. Reintenta la consulta.'}finally{if(!this.disposed && isCurrentAuthorization(context,this.$store))this.documentTemplateSaving=false}return}
            this.documentTemplateErrors = {}
            this.documentTemplateSaveError = ''
            const name = String(this.documentTemplateForm.name || '').trim()
            const content = sanitizeHtmlForDocumentSnapshot(this.documentTemplateContentForSave)
            const fragment = document.createElement('div')
            fragment.innerHTML = content
            if(!name) this.$set(this.documentTemplateErrors, 'name', 'Escribe el nombre de la plantilla.')
            if(!String(fragment.textContent || '').replace(/[\s\u200b-\u200d\ufeff]/g, '') && !fragment.querySelector('img[src]')) this.$set(this.documentTemplateErrors, 'content_html', 'Escribe el contenido del documento o inserta datos automáticos.')
            if(Object.keys(this.documentTemplateErrors).length) {
                this.focusInvalid([this.documentTemplateErrors.name ? 'documentTemplateName' : 'documentContentInput'])
                return
            }
            if(this.unknownDocumentVariables.length > 0) {
                this.toastFunction('error','Corrige los datos automáticos no reconocidos antes de guardar.')
                return
            }

            const payload = {
                ...this.documentTemplateForm,
                name,
                ...this.documentTemplateLicenseMetadata(this.documentTemplateForm.document_license_tier),
                content_html: content
            }
            this.documentTemplateSaving = true
            try {
                this.pendingDocumentSave=payload
                const response = await DADocumentService.saveTemplate(payload)
                if(this.disposed || !isCurrentAuthorization(context,this.$store))return
                if(response && response.success) {
                    this.pendingDocumentSave=null
                    this.documentTemplates = response.data || []
                    this.documentTemplateDialog = false
                    this.toastFunction('success', payload.id_document_template ? 'Nueva versión guardada.' : 'Plantilla creada.')
                    return
                }
                if(Number(response && response.status)<500)this.pendingDocumentSave=null
                this.documentTemplateErrors = (response && response.data && response.data.fieldErrors) || {}
                this.documentTemplateSaveError = this.pendingDocumentSave ? 'No se pudo confirmar el guardado. El siguiente intento comprobará la lista sin crear otra versión.' : buildLicenseLimitMessage(response, response && response.message ? response.message : 'No se pudo guardar la plantilla. Conservamos tu captura; revisa los datos e intenta de nuevo.')
            } catch(_) { if(!this.disposed && isCurrentAuthorization(context,this.$store))this.documentTemplateSaveError = 'No se pudo confirmar el guardado. Tu captura se conserva; el siguiente intento comprobará la lista sin crear otra versión.' }
            finally { if(!this.disposed && isCurrentAuthorization(context,this.$store))this.documentTemplateSaving = false }
        },

        appendDocumentVariable: function(variable) {
            const field = this.$refs.documentContentInput
            const input = field && field.$refs ? field.$refs.input : null
            const current = this.activeDocumentContentModel || ''

            if(input && typeof input.selectionStart === 'number') {
                const start = input.selectionStart
                const end = input.selectionEnd
                this.activeDocumentContentModel = `${current.slice(0, start)}${variable}${current.slice(end)}`
                this.$nextTick(() => {
                    input.focus()
                    const cursor = start + variable.length
                    input.setSelectionRange(cursor, cursor)
                })
            } else {
                this.activeDocumentContentModel = `${current}${current ? ' ' : ''}${variable}`
            }
            this.toastFunction('success','Dato agregado al documento.')
        },

        requestInsertDocumentExample: function() {
            if((this.activeDocumentContentModel || '').trim()) {
                this.confirmExampleDialog = true
                return
            }
            this.insertDocumentExample()
        },

        insertDocumentExample: function() {
            const plainExample = 'Yo, {{nombrePaciente}}, autorizo a {{nombreDoctor}} del consultorio {{nombreConsultorio}} a realizar la atención descrita en este documento.\n\nFecha: {{fechaActual}}'
            this.activeDocumentContentModel = this.documentTemplateForm.advanced_mode ? this.plainTextToHtml(plainExample) : plainExample
            this.confirmExampleDialog = false
            this.toastFunction('success','Ejemplo agregado.')
        },

        onToggleDocumentAdvancedMode: function() {
            if(this.documentTemplateForm.advanced_mode) {
                this.documentTemplateForm.content_html = this.plainTextToHtml(this.documentTemplateForm.content_text || this.htmlToPlainText(this.documentTemplateForm.content_html || ''))
                return
            }
            this.documentTemplateForm.content_text = this.htmlToPlainText(this.documentTemplateForm.content_html || '')
        },

        htmlToPlainText: function(html) {
            return String(html || '')
                .replace(/<\s*br\s*\/?>/gi, '\n')
                .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li)>/gi, '\n')
                .replace(/<li[^>]*>/gi, '- ')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(/\n{3,}/g, '\n\n')
                .trim()
        },

        plainTextToHtml: function(text) {
            const escapeHtml = (value) => String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')

            return String(text || '')
                .split(/\n{2,}/)
                .map((block) => block.trim())
                .filter((block) => block)
                .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
                .join('')
        },

        documentTemplateSignaturesLabel: function(template) {
            const enabled = (value) => value === true || value === 1 || value === '1'
            const labels = []
            if(enabled(template.requires_patient_signature)) labels.push('Paciente')
            if(enabled(template.requires_tutor_signature)) labels.push('Tutor/representante')
            if(enabled(template.requires_doctor_signature)) labels.push('Doctor')
            if(enabled(template.requires_witness1_signature)) labels.push('Testigo 1')
            if(enabled(template.requires_witness2_signature)) labels.push('Testigo 2')
            if(labels.length === 0) {
                return 'Sin firmas requeridas'
            }
            if(labels.length === 1) {
                return labels[0]
            }
            return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1].toLowerCase()}`
        },

        humanizeDocumentText: function(value) {
            return String(value || '')
                .replace(/atencion/g, 'atención')
                .replace(/Atencion/g, 'Atención')
                .replace(/generica/g, 'genérica')
                .replace(/Generica/g, 'Genérica')
                .replace(/valoracion/g, 'valoración')
                .replace(/Valoracion/g, 'Valoración')
                .replace(/exploracion/g, 'exploración')
                .replace(/Exploracion/g, 'Exploración')
                .replace(/integracion/g, 'integración')
                .replace(/Integracion/g, 'Integración')
                .replace(/cedula/g, 'cédula')
                .replace(/Cedula/g, 'Cédula')
                .replace(/diagnostico/g, 'diagnóstico')
                .replace(/Diagnostico/g, 'Diagnóstico')
                .replace(/informacion/g, 'información')
                .replace(/Informacion/g, 'Información')
                .replace(/automaticos/g, 'automáticos')
                .replace(/Automaticos/g, 'Automáticos')
                .replace(/clinico/g, 'clínico')
                .replace(/Clinico/g, 'Clínico')
                .replace(/medica/g, 'médica')
                .replace(/Medica/g, 'Médica')
                .replace(/aplicaran/g, 'aplicarán')
                .replace(/Aplicaran/g, 'Aplicarán')
        },

        documentTemplateTypeLabel: function(type) {
            const found = this.documentTemplateTypeOptions.find((item) => item.value === type)
            if(found) {
                return found.label
            }
            if(type === 'CUSTOM') {
                return 'Documento personalizado'
            }
            return 'Documento clínico'
        },

        onSaveConsentConfig: async function(){
            const isDocuments = this.activeSection === 'documents'
            const consent = this.consentimiento || ''
            const state = this.declaracion || ''
            const doctorName = this.nombredr || ''

            if (isDocuments && (!consent.trim() || !state.trim())){
                this.toastFunction('error','Completa los textos de documentos.')
                return
            }

            if (!isDocuments && !doctorName.trim()){
                this.toastFunction('error','Captura el nombre del doctor.')
                return
            }

            if (!this.id_signature_consent && !isDocuments && (this.newSignature == '' || this.newSignature == undefined)){
                this.toastFunction('error','No se ha aplicado la firma.')
                return
            }

            const signatureUrl = this.newSignature ? this.url_signature : (this.url_signature || this.idsignatunature);
            const data = {
                id_signature_consent: this.id_signature_consent,
                key_signature: this.key_signature,
                url_signature: signatureUrl,
                consent:  consent,
                state:    state,
                name:     doctorName || this.nombredr || '',
                files:{
                    file: this.newSignature
                }
            };

            let response = null
            if(this.id_signature_consent) {
                response = await this.editConfiguration(data)
            }
            else {
                response = await this.saveConfiguration(data)
            }

            if(!response || !response.success) {
                this.toastFunction('error', response && response.message ? response.message : 'No se pudo guardar la configuracion.')
                return
            }

            this.toastFunction('success','Configuracion guardada.')
            await this.onGetConfiguration()
            this.updateSignature = false
            this.isModify = true
        },

        onGetConfiguration: async function(){
            await this.getConfiguration()
        },

        cloneBusinessInfo: function(source) {
            const info = source || this.businessInfo || {}

            return {
                id_business: info.id_business || '',
                name: info.name || '',
                legalName: info.legalName || '',
                slug: info.slug || '',
                email: info.email || '',
                phone: info.phone || '',
                address: info.address || '',
                logoUrl: info.logoUrl || '',
                status: info.status || '',
                subscriptionStatus: info.subscriptionStatus || '',
                trialStartsAt: info.trialStartsAt || '',
                trialEndsAt: info.trialEndsAt || '',
                currentPeriodStartsAt: info.currentPeriodStartsAt || '',
                currentPeriodEndsAt: info.currentPeriodEndsAt || '',
                plan: info.plan || ''
            }
        },

        getBusinessInfoPayload: function() {
            return {
                name: this.businessInfo.name,
                legalName: this.businessInfo.legalName,
                email: this.businessInfo.email,
                phone: this.businessInfo.phone,
                address: this.businessInfo.address,
                logoUrl: this.businessInfo.logoUrl
            }
        },

        onStartBusinessInfoEdit: function() {
            if(this.businessInfoLoading || this.businessInfoError || !this.businessInfoOriginal) return
            this.businessInfoOriginal = this.cloneBusinessInfo()
            this.businessFieldErrors = {}
            this.businessSaveError = ''
            this.businessInfoEditing = true
        },

        onCancelBusinessInfoEdit: async function() {
            if(this.businessInfoSaving) return
            if(this.businessInfoDirty && !await confirmSettingsDiscard(this)) return
            if(this.businessInfoOriginal) {
                this.businessInfo = this.cloneBusinessInfo(this.businessInfoOriginal)
            }

            this.businessInfoEditing = false
        },

        onGetBusinessInfo: async function(){
            if(this.businessInfoLoading || this.businessInfoDirty) return
            const context = authorizationContext(this.$store)
            this.businessInfoLoading = true
            this.businessInfoError = ''
            try {
                const response = await DABusinessService.getCurrent()
                if(!this.settingsReadStillCurrent(context, 'businessInfoError')) return
                if(!response || !response.success || !response.data) throw new Error('read')
                this.businessInfo = {
                    id_business: response.data.id_business || '',
                    name: response.data.name || '',
                    legalName: response.data.legalName || '',
                    slug: response.data.slug || '',
                    email: response.data.email || '',
                    phone: response.data.phone || '',
                    address: response.data.address || '',
                    logoUrl: response.data.logoUrl || '',
                    status: response.data.status || '',
                    subscriptionStatus: response.data.subscriptionStatus || '',
                    trialStartsAt: response.data.trialStartsAt || '',
                    trialEndsAt: response.data.trialEndsAt || '',
                    currentPeriodStartsAt: response.data.currentPeriodStartsAt || '',
                    currentPeriodEndsAt: response.data.currentPeriodEndsAt || '',
                    plan: response.data.plan || ''
                }
                this.businessInfoOriginal = this.cloneBusinessInfo(this.businessInfo)
                this.businessInfoEditing = false
            } catch(_) { if(isCurrentAuthorization(context, this.$store)) this.businessInfoError = 'No se pudieron cargar los datos del consultorio. Reintenta para verlos y editarlos.' }
            finally { this.businessInfoLoading = false }
        },

        onSaveBusinessInfo: async function(){
            if(this.businessInfoSaving || this.businessInfoLoading || this.businessInfoError || !this.businessInfoOriginal) {
                return
            }

            const context=authorizationContext(this.$store)
            if(this.pendingBusinessSave){this.businessInfoSaving=true;try{await this.reconcileBusinessSave(context)}catch(_){if(isCurrentAuthorization(context,this.$store))this.businessSaveError='No pudimos comprobar el guardado anterior. Reintenta la consulta.'}finally{if(!this.disposed && isCurrentAuthorization(context,this.$store))this.businessInfoSaving=false}return}
            const validation = validateBusinessProfile(this.getBusinessInfoPayload())
            this.businessFieldErrors = validation.fieldErrors
            this.businessSaveError = ''
            if(!validation.isValid) {
                this.focusInvalid(Object.keys(validation.fieldErrors).map(field => 'business_' + field))
                return
            }

            this.businessInfoSaving = true
            try {
                this.pendingBusinessSave=validation.data
                const response = await DABusinessService.updateCurrent(validation.data)
                if(this.disposed || !isCurrentAuthorization(context,this.$store))return
                if(response && response.success) {
                    this.pendingBusinessSave=null
                    this.businessInfo = { ...this.businessInfo, ...validation.data, ...(response.data || {}) }
                    this.businessInfoOriginal = this.cloneBusinessInfo()
                    this.businessInfoEditing = false
                    this.toastFunction('success','Informacion del consultorio guardada.')
                    return
                }

                if(Number(response && response.status)<500)this.pendingBusinessSave=null
                this.businessFieldErrors = response && response.data && response.data.fieldErrors || {}
                this.businessSaveError = this.pendingBusinessSave ? 'No se pudo confirmar el guardado. El siguiente intento comprobará los datos guardados sin reenviar.' : response && response.message ? response.message : 'No se pudo guardar el consultorio. Conservamos tu captura; revisa los datos e intenta de nuevo.'
                this.focusInvalid(Object.keys(this.businessFieldErrors).map(field => 'business_' + field))
            } catch(_) { if(!this.disposed && isCurrentAuthorization(context,this.$store))this.businessSaveError = 'No se pudo confirmar el guardado. Tu captura se conserva; el siguiente intento comprobará los datos guardados.' }
            finally {
                if(!this.disposed && isCurrentAuthorization(context,this.$store))this.businessInfoSaving = false
            }
        },

        onSigned: function(data) {
            this.newSignature = data;
        },

        onModifySignature: function(){
            this.idsignatunature = this.url_signature
            if(this.activeSection === 'identity') {
                this.url_signature = ''
            }
            this.newSignature = ''
            this.signatureImageError = false
            this.updateSignature = true
            this.isModify = false
        },

        onCancelModifySignature: function(){
            this.url_signature = this.idsignatunature
            this.newSignature = ''
            this.signatureImageError = false
            this.updateSignature = false
            this.isModify = true
        },

        onSelectLoginImage: async function(event) {
            if(this.loginImageSaving || this.loginImageProcessing || this.appearanceLoading || this.appearanceError) return
            const file = event.target.files && event.target.files[0];
            if(!file) {
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            this.loginImageError = '';

            if(!allowedTypes.includes(file.type)) {
                this.loginImageError = 'Formato no permitido. Usa JPG, PNG o WEBP.';
                this.clearLoginImageInput();
                return;
            }

            if(file.size > 5 * 1024 * 1024) {
                this.loginImageError = 'El archivo original no debe superar 5 MB.';
                this.clearLoginImageInput();
                return;
            }

            const context = authorizationContext(this.$store)
            this.loginImageProcessing = true
            try {
                const imageData = await this.readFileAsDataUrl(file);
                const resized = await resizeImage(imageData, 700, 250, file.type, 0.92);
                if(this.disposed || this.activeSection !== 'appearance' || !isCurrentAuthorization(context, this.$store)) return
                this.loginImagePreview = resized;
                this.loginImageFileName = file.name;
            } catch(_) { this.loginImageError = 'No se pudo abrir la imagen. Selecciona otro archivo JPG, PNG o WEBP.'; this.clearLoginImageInput() }
            finally { this.loginImageProcessing = false }
        },

        onSaveLoginImage: async function() {
            if(this.loginImageSaving || this.loginImageProcessing || this.appearanceLoading || this.appearanceError) return
            if(!this.loginImagePreview) {
                this.toastFunction('error','Selecciona un logo primero.')
                return;
            }

            this.loginImageSaving = true
            try {
            const response = await this.saveLoginImage({
                image_data: this.loginImagePreview,
                original_name: this.loginImageFileName
            })

            if(!response || !response.success) {
                this.loginImageError = response && response.message || 'No se pudo guardar el logo. Conservamos la imagen seleccionada; intenta de nuevo.'
                return
            }

            this.toastFunction('success','Logo de acceso guardado.')
            this.loginImageOriginal = this.loginImagePreview
            this.loginImageOriginalName = this.loginImageFileName
            setStoredLoginLogo(this.loginImagePreview)
            } catch(_) { this.loginImageError = 'No se pudo guardar el logo. Conservamos la imagen seleccionada; revisa la conexión e intenta de nuevo.' }
            finally { this.loginImageSaving = false }
        },

        onSelectTheme: function(theme) {
            if(this.isThemeSaving || this.appearanceLoading || this.appearanceError) return
            if(this.savedTheme && theme.code === this.savedTheme.code) {
                restoreThemePreview(this.savedTheme)
                this.selectedThemeCode = this.savedTheme.code
                return
            }
            if(applyTheme(theme)) this.selectedThemeCode = theme.code
        },

        ensureSelectedTheme: function() {
            if(this.activeTheme && this.activeTheme.code) {
                this.selectedThemeCode = this.activeTheme.code
            }
        },

        onSaveTheme: async function() {
            if(this.isThemeSaving || this.appearanceLoading || this.appearanceError) return
            if(!this.selectedThemeCode) {
                this.toastFunction('error','Selecciona un tema primero.')
                return
            }

            const context = getThemeContext(this.$store.state.CORE.AUTH)
            this.isThemeSaving = true
            try {
                const response = await this.saveTheme({ code: this.selectedThemeCode })
                if(getThemeContext(this.$store.state.CORE.AUTH) !== context) return
                if(!response || !response.success) {
                    this.toastFunction('error', (response && response.message) || 'No fue posible guardar el tema.')
                    return
                }
                this.toastFunction('success','Tema guardado.')
                this.savedTheme = { ...this.activeTheme }
                this.savedThemeContext = context
            } catch(_) { this.toastFunction('error', 'No se pudo guardar el tema. Puedes reintentar o descartar la vista previa.') }
            finally {
                this.isThemeSaving = false
            }
        },

        applyClinicalModules: function() {
            const modules = this.clinicalModules || {}
            this.clinicalModulesForm = {
                odontogramEnabled: Boolean(modules.odontogramEnabled),
                treatmentPlanEnabled: modules.treatmentPlanEnabled === undefined ? true : Boolean(modules.treatmentPlanEnabled),
                allowTreatmentToothSelection: Boolean(modules.allowTreatmentToothSelection),
                showTreatmentCosts: modules.showTreatmentCosts === undefined ? true : Boolean(modules.showTreatmentCosts),
                showTreatmentStatus: modules.showTreatmentStatus === undefined ? true : Boolean(modules.showTreatmentStatus)
            }
            if(!this.clinicalModulesForm.odontogramEnabled) {
                this.clinicalModulesForm.allowTreatmentToothSelection = false
            }
        },

        onSaveClinicalModules: async function() {
            if(this.clinicalModulesSaving || this.clinicalModulesLoading || this.clinicalModulesError || !this.clinicalModulesOriginal) return
            this.clinicalModulesSaving = true
            try {
            const response = await this.saveClinicalModules({
                config: {
                    odontogramEnabled: Boolean(this.clinicalModulesForm.odontogramEnabled),
                    treatmentPlanEnabled: Boolean(this.clinicalModulesForm.treatmentPlanEnabled),
                    allowTreatmentToothSelection: Boolean(this.clinicalModulesForm.odontogramEnabled && this.clinicalModulesForm.allowTreatmentToothSelection),
                    showTreatmentCosts: Boolean(this.clinicalModulesForm.showTreatmentCosts),
                    showTreatmentStatus: Boolean(this.clinicalModulesForm.showTreatmentStatus)
                }
            })

            if(response && response.success) {
                this.applyClinicalModules()
                this.clinicalModulesOriginal = JSON.stringify(this.clinicalModulesForm)
                this.toastFunction('success','Secciones clínicas guardadas.')
                return
            }

            this.toastFunction('error', response && response.message ? response.message : 'No se pudieron guardar las secciones clínicas.')
            } catch(_) { this.toastFunction('error', 'No se pudieron guardar las secciones clínicas. Conservamos tu selección; intenta de nuevo.') }
            finally { this.clinicalModulesSaving = false }
        },

        themeSwatches: function(theme) {
            return [
                theme.primary_100,
                theme.primary_500,
                theme.primary_700,
                theme.primary_900,
                theme.secondary_500
            ]
        },

        dayName: function(dayOfWeek) {
            const day = this.weekDays.find((item) => Number(item.value) === Number(dayOfWeek))
            return day ? day.label : ''
        },

        cloneRanges: function(ranges) {
            return (ranges || []).map((range) => ({
                id: range.id || createId('range'),
                startTime: range.startTime,
                endTime: range.endTime
            }))
        },

        openEditDay: function(day) {
            this.editingDay = {
                id: day.id,
                dayOfWeek: day.dayOfWeek,
                enabled: day.enabled,
                timeRanges: this.cloneRanges(day.timeRanges)
            }
            this.editingDayError = ''
            this.dayDialog = true
        },

        addEditingRange: function() {
            this.editingDay.timeRanges.push({
                id: createId('range'),
                startTime: '08:00',
                endTime: '12:00'
            })
        },

        removeEditingRange: function(rangeId) {
            this.editingDay.timeRanges = this.editingDay.timeRanges.filter((range) => range.id !== rangeId)
        },

        validateTimeRanges: function(ranges) {
            const sortedRanges = this.cloneRanges(ranges).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

            for(let index = 0; index < sortedRanges.length; index += 1) {
                const range = sortedRanges[index]
                if(!range.startTime || !range.endTime) {
                    return 'Completa inicio y fin de cada rango.'
                }

                if(timeToMinutes(range.startTime) >= timeToMinutes(range.endTime)) {
                    return 'La hora de inicio debe ser menor que la hora fin.'
                }

                const nextRange = sortedRanges[index + 1]
                if(nextRange && timeToMinutes(range.endTime) > timeToMinutes(nextRange.startTime)) {
                    return 'Los rangos no deben empalmarse.'
                }
            }

            return ''
        },

        saveEditingDay: function() {
            if(this.editingDay.enabled) {
                const error = this.validateTimeRanges(this.editingDay.timeRanges)
                if(error) {
                    this.editingDayError = error
                    return
                }
            }

            const dayIndex = this.appointmentConfig.workingDays.findIndex((day) => Number(day.dayOfWeek) === Number(this.editingDay.dayOfWeek))
            if(dayIndex >= 0) {
                this.appointmentConfig.workingDays.splice(dayIndex, 1, {
                    id: this.editingDay.id || createId('day'),
                    dayOfWeek: this.editingDay.dayOfWeek,
                    enabled: this.editingDay.enabled,
                    timeRanges: this.editingDay.enabled ? this.cloneRanges(this.editingDay.timeRanges) : []
                })
            }

            this.dayDialog = false
        },

        openCopyDay: function(day) {
            this.copySourceDay = day
            this.copyTargetDays = this.weekDays
                .filter((item) => Number(item.value) !== Number(day.dayOfWeek) && Number(item.value) >= 1 && Number(item.value) <= 5)
                .map((item) => item.value)
            this.copyDialog = true
        },

        copyScheduleToTargets: function() {
            this.copyTargetDays.forEach((dayOfWeek) => {
                const day = this.appointmentConfig.workingDays.find((item) => Number(item.dayOfWeek) === Number(dayOfWeek))
                if(day) {
                    day.enabled = true
                    day.timeRanges = this.cloneRanges(this.copySourceDay.timeRanges)
                }
            })
            this.copyDialog = false
            this.toastFunction('success','Horario copiado.')
        },

        openBlockDialog: function(mode, block) {
            this.blockMode = mode
            this.blockError = ''
            this.editingBlock = block
                ? Object.assign({}, block)
                : {
                    id: '',
                    date: '',
                    dayOfWeek: 1,
                    startTime: '13:00',
                    endTime: '14:00',
                    reason: '',
                    repeats: false,
                    repeatType: 'none'
                }
            this.blockDialog = true
        },

        saveBlock: function() {
            if(this.blockMode === 'date') {
                if(!this.editingBlock.date) {
                    this.blockError = 'Selecciona una fecha.'
                    return
                }

                const block = {
                    id: this.editingBlock.id || createId('blocked-date'),
                    date: this.editingBlock.date,
                    dayOfWeek: new Date(`${this.editingBlock.date}T00:00:00`).getDay(),
                    reason: this.editingBlock.reason || 'Dia bloqueado',
                    repeats: this.editingBlock.repeats,
                    repeatType: this.editingBlock.repeats ? 'weekly' : 'none'
                }
                const index = this.appointmentConfig.blockedDates.findIndex((item) => item.id === block.id)
                if(index >= 0) {
                    this.appointmentConfig.blockedDates.splice(index, 1, block)
                } else {
                    this.appointmentConfig.blockedDates.push(block)
                }
            } else {
                if(!this.editingBlock.repeats && !this.editingBlock.date) {
                    this.blockError = 'Selecciona una fecha o activa repeticion semanal.'
                    return
                }

                if(timeToMinutes(this.editingBlock.startTime) >= timeToMinutes(this.editingBlock.endTime)) {
                    this.blockError = 'La hora inicio debe ser menor que la hora fin.'
                    return
                }

                const block = {
                    id: this.editingBlock.id || createId('blocked-hour'),
                    date: this.editingBlock.repeats ? '' : this.editingBlock.date,
                    dayOfWeek: this.editingBlock.repeats ? this.editingBlock.dayOfWeek : new Date(`${this.editingBlock.date}T00:00:00`).getDay(),
                    startTime: this.editingBlock.startTime,
                    endTime: this.editingBlock.endTime,
                    reason: this.editingBlock.reason || 'Horario bloqueado',
                    repeats: this.editingBlock.repeats,
                    repeatType: this.editingBlock.repeats ? 'weekly' : 'none'
                }
                const index = this.appointmentConfig.blockedHours.findIndex((item) => item.id === block.id)
                if(index >= 0) {
                    this.appointmentConfig.blockedHours.splice(index, 1, block)
                } else {
                    this.appointmentConfig.blockedHours.push(block)
                }
            }

            this.blockDialog = false
        },

        removeBlock: function(block) {
            if(block.type === 'date') {
                this.removeBlockedDate(block.raw.id)
            } else {
                this.removeBlockedHour(block.raw.id)
            }
        },

        addTimeRange: function(day) {
            day.enabled = true
            day.timeRanges.push({
                id: createId('range'),
                startTime: '08:00',
                endTime: '12:00'
            })
        },

        removeTimeRange: function(day, rangeId) {
            day.timeRanges = day.timeRanges.filter((range) => range.id !== rangeId)
        },

        addBlockedDate: function() {
            if(!this.newBlockedDate.date) {
                this.toastFunction('error','Selecciona una fecha para bloquear.')
                return
            }

            this.appointmentConfig.blockedDates.push({
                id: createId('blocked-date'),
                date: this.newBlockedDate.date,
                dayOfWeek: new Date(`${this.newBlockedDate.date}T00:00:00`).getDay(),
                reason: this.newBlockedDate.reason || 'Dia bloqueado',
                repeats: this.newBlockedDate.repeats,
                repeatType: this.newBlockedDate.repeats ? 'weekly' : 'none'
            })
            this.newBlockedDate = { date: '', reason: '', repeats: false }
        },

        addBlockedHour: function() {
            if(!this.newBlockedHour.startTime || !this.newBlockedHour.endTime) {
                this.toastFunction('error','Selecciona inicio y fin del bloqueo.')
                return
            }

            if(!this.newBlockedHour.repeats && !this.newBlockedHour.date) {
                this.toastFunction('error','Selecciona una fecha o activa repeticion semanal.')
                return
            }

            this.appointmentConfig.blockedHours.push({
                id: createId('blocked-hour'),
                date: this.newBlockedHour.repeats ? '' : this.newBlockedHour.date,
                dayOfWeek: this.newBlockedHour.repeats ? this.newBlockedHour.dayOfWeek : new Date(`${this.newBlockedHour.date}T00:00:00`).getDay(),
                startTime: this.newBlockedHour.startTime,
                endTime: this.newBlockedHour.endTime,
                reason: this.newBlockedHour.reason || 'Horario bloqueado',
                repeats: this.newBlockedHour.repeats,
                repeatType: this.newBlockedHour.repeats ? 'weekly' : 'none'
            })
            this.newBlockedHour = {
                date: '',
                dayOfWeek: 1,
                startTime: '13:00',
                endTime: '14:00',
                reason: '',
                repeats: false
            }
        },

        removeBlockedDate: function(id) {
            this.appointmentConfig.blockedDates = this.appointmentConfig.blockedDates.filter((block) => block.id !== id)
        },

        removeBlockedHour: function(id) {
            this.appointmentConfig.blockedHours = this.appointmentConfig.blockedHours.filter((block) => block.id !== id)
        },

        blockedDateLabel: function(block) {
            const dateLabel = block.repeats ? this.dayName(block.dayOfWeek) : block.date
            return `${dateLabel} - ${block.reason}${block.repeats ? ' (semanal)' : ''}`
        },

        blockedHourLabel: function(block) {
            const dateLabel = block.repeats ? this.dayName(block.dayOfWeek) : block.date
            return `${dateLabel} ${block.startTime}-${block.endTime} - ${block.reason}${block.repeats ? ' (semanal)' : ''}`
        },

        onGetAppointmentConfig: async function() {
            const response = await DAAppointmentService.getConfig('business')
            if(response && response.success && response.data) {
                this.appointmentConfig = normalizeAppointmentConfig(response.data)
                saveAppointmentConfig(this.appointmentConfig)
            }
        },

        onGetPrescriptionConfigStatus: async function() {
            const response = await DAPrescriptionService.getConfig()
            this.prescriptionConfigStatus = response && response.success ? response.data : null
        },

        onGetProfessionalProfileStatus: async function() {
            const response = await DAUserService.getMyProfessionalProfile()
            this.professionalProfileStatus = response && response.success ? response.data : null
        },

        onProfessionalProfileSaved: async function() {
            this.toastFunction('success','Perfil profesional guardado.')
            await this.onGetProfessionalProfileStatus()
            if(this.$store.state.CORE.ONBOARDING.guide === 'active') await this.$store.dispatch('CORE/ONBOARDING/refresh',{force:true})
        },

        onSaveAppointmentConfig: async function() {
            const response = await DAAppointmentService.saveConfig(this.appointmentConfig)
            if(response && response.success) {
                this.appointmentConfig = normalizeAppointmentConfig(response.data || this.appointmentConfig)
                saveAppointmentConfig(this.appointmentConfig)
                this.toastFunction('success','Configuracion de agenda guardada.')
                return
            }

            this.toastFunction('error', response && response.message ? response.message : 'No se pudo guardar la agenda.')
        },

        readFileAsDataUrl: function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },

        clearLoginImageInput: function() {
            this.loginImageInputKey += 1;
        },

        toastFunction: function(type,text){
            const Toast = this.$swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', this.$swal.stopTimer)
                    toast.addEventListener('mouseleave', this.$swal.resumeTimer)
                }
            })

            Toast.fire({
                icon: type,
                title: text
            })
        }
    },
    watch: {
        activeSection() { this.init() },
        getConfigurations: function() {
            if(this.getConfigurations) {
                this.consentimiento         = this.getConfigurations.consent
                this.declaracion            = this.getConfigurations.state
                this.nombredr               = this.getConfigurations.name
                this.key_signature          = this.getConfigurations.key_signature
                this.id_signature_consent   = this.getConfigurations.id_signature_consent
                this.url_signature          = this.getConfigurations.url_signature
                this.signatureImageError    = false
            }
        },
        getLoginImageData: function() {
            if(this.appearanceDirty || this.appearanceLoading || this.loginImageSaving) return
            if(this.getLoginImageData && this.getLoginImageData.image_data) {
                this.loginImagePreview = this.getLoginImageData.image_data
                this.loginImageFileName = this.getLoginImageData.original_name || 'Imagen configurada'
                setStoredLoginLogo(this.getLoginImageData.image_data)
            }
        },
        activeTheme: function() {
            this.ensureSelectedTheme()
        },
        themeList: function() {
            this.ensureSelectedTheme()
        },
        clinicalModules: function() {
            if(!this.clinicalModulesDirty && !this.clinicalModulesLoading && !this.clinicalModulesSaving) this.applyClinicalModules()
        }
    }
}
</script>

<style scoped>
.settings-dialog-scroll { overscroll-behavior: contain; }
.settings-theme-option:focus-visible { outline: 3px solid var(--color-primary-700); outline-offset: 3px; }
fieldset { border: 0; margin: 0; }
</style>
