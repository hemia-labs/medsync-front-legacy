<template>
  <div class="pulse-page">
    <header class="pulse-heading">
      <div>
        <p class="pulse-kicker">Todo el consultorio</p>
        <h1>Pulso del consultorio</h1>
        <p class="pulse-intro">Cada señal tiene una historia. Descubre qué necesita atención.</p>
      </div>
      <router-link :to="{name:'home'}">Ir a Inicio <span aria-hidden="true">↗</span></router-link>
    </header>

    <div v-if="!allowed || st.denied" class="pulse-notice" role="alert">
      <h2>Esta lectura necesita acceso al consultorio completo</h2>
      <p>Tu acceso cambió o no permite consultar el Pulso. Solicita al administrador que revise tus permisos.</p>
      <button v-if="allowed" type="button" @click="restart">Revalidar acceso</button> <router-link :to="{name:'home'}">Volver a Inicio</router-link>
    </div>

    <template v-else>
      <section class="pulse-overview" aria-labelledby="pulse-state" :aria-busy="busy ? 'true' : 'false'">
        <div class="pulse-hero">
          <div class="pulse-state-copy" :class="'state-' + category">
            <div>
              <span class="pulse-status" :class="'status-' + category">{{ story.priority ? 'Empieza por aquí' : 'En esta revisión' }}</span>
              <h2 id="pulse-state">{{ story.title }}</h2>
              <p>{{ story.text }}</p>
            </div>
            <button v-if="story.action" type="button" class="pulse-primary pulse-story-action" @click="selectList(story.indicatorId,story.severity)">{{ story.action }} →</button>
            <a v-else href="#pulse-priorities">Ver próximos pasos ↓</a>
          </div>

          <ul v-if="data" class="pulse-vitals" aria-label="Resumen de esta lectura">
            <li v-for="vital in vitals" :key="vital.key" :class="'vital-' + vital.tone">
              <a :href="'#' + vital.target">
                <strong>{{ vital.value }}</strong>
                <span>{{ vital.label }}</span>
                <small>{{ vital.hint }}</small>
              </a>
            </li>
          </ul>
        </div>

        <div v-if="st.appointmentOutcome || verifying" ref="outcome" class="pulse-outcome" :class="{'outcome-verified':verifiedResult}" role="status" aria-live="polite" tabindex="-1">
          <span aria-hidden="true">{{ verifiedResult ? '✓' : '◌' }}</span>
          <div>
            <strong>{{ verifying ? 'Comprobando cómo quedó la cita…' : verifiedResult ? outcomeTitle : st.appointmentOutcome.message }}</strong>
            <p v-if="verifiedResult">{{ agendaResultText }}</p>
          </div>
          <button v-if="!verifying && st.pendingAppointment" type="button" :disabled="busy" @click="verifyReturn">Volver a comprobar</button>
        </div>

        <pulse-backdrop v-if="data" :visual="skyVisual" :priorities="scenePriorities" :notes="sceneNotes" :recognition="recognition" :expired="Boolean(expired)" :updating="busy" @refresh="update" @review-note="reviewNote" @review-priority="selectList($event)"/>
        <div v-else class="pulse-quiet-sky"><span>Reuniendo la información de tu consultorio…</span></div>

        <div class="pulse-update-bar">
          <div>
            <p v-if="data">{{ expired ? 'Lectura anterior' : 'Revisado' }} · <time :datetime="data.snapshot.calculatedAt">{{ formatTime(data.snapshot.calculatedAt) }}</time><span v-if="st.candidate"> · Hay una lectura nueva disponible</span></p>
            <p v-if="st.savedAt && !st.pendingAppointment">Tu cambio se guardó. Actualiza para comprobar cómo quedó el Pulso.</p>
            <p class="pulse-muted">Seguimientos, firmas y citas registrados. No evalúa finanzas ni calidad clínica.</p>
          </div>
          <div class="pulse-controls">
            <button type="button" :disabled="busy" @click="update">{{ busy ? 'Consultando…' : st.candidate && !expiredCandidate ? 'Ver cambios' : 'Actualizar Pulso' }}</button>
            <a href="#pulse-priorities">Explorar pendientes ↓</a>
          </div>
        </div>
        <p v-if="st.errors.snapshot" class="pulse-error" role="alert">{{ friendlyError('snapshot') }} <button type="button" :disabled="busy" @click="update">Volver a intentar</button></p>
      </section>

      <p class="pulse-announcement" role="status" aria-live="polite">{{ announcement }}</p>

      <nav class="pulse-nav" aria-label="Secciones del Pulso">
        <a v-for="link in sectionLinks" :key="link.target" :href="'#' + link.target">
          <span aria-hidden="true">{{ link.mark }}</span>{{ link.label }}<b v-if="link.count">{{ link.count }}</b>
        </a>
      </nav>

      <section v-if="data" id="pulse-play" class="pulse-play" aria-labelledby="pulse-play-title">
        <div class="pulse-play-heading">
          <div>
            <p class="pulse-kicker">Para cerrar pendientes con ritmo</p>
            <h2 id="pulse-play-title">Tu jugada de hoy</h2>
          </div>
          <span v-if="streak.current" class="pulse-play-chip">✦ Racha de {{ streak.current }} {{ streak.current === 1 ? 'día' : 'días' }}</span>
        </div>
        <p v-if="celebration" class="pulse-celebrate" role="status">✦ {{ celebration }}</p>

        <div class="pulse-play-grid">
          <article v-if="session || sessionSize" id="pulse-session" class="pulse-play-card play-session" tabindex="-1" :aria-busy="sessionBusy ? 'true' : 'false'">
            <template v-if="!session">
              <div class="session-intro">
                <div class="session-number" aria-hidden="true">{{ sessionSize }}</div>
                <div>
                  <span class="pulse-kicker">Sesión de cierre</span>
                  <h3>Cierra {{ sessionSize }}</h3>
                  <p>Te armamos una tanda corta: primero lo que urge, luego lo que está por volverse prioridad y después lo más antiguo. Avanza uno por uno sin perder el hilo.</p>
                </div>
              </div>
              <button type="button" class="pulse-primary" :disabled="sessionBusy" @click="startSession">{{ sessionBusy ? 'Preparando tu tanda…' : 'Empezar sesión' }}</button>
            </template>
            <template v-else>
              <span class="pulse-kicker">Sesión de cierre · {{ sessionDone }} de {{ session.items.length }}</span>
              <ol class="session-dots" aria-hidden="true">
                <li v-for="entry in session.items" :key="entry.indicatorId + entry.recordId" :class="{'dot-done':entry.done,'dot-current':sessionCurrent && entry.recordId === sessionCurrent.recordId && entry.indicatorId === sessionCurrent.indicatorId,'dot-skipped':entry.skipped && !entry.done}"></li>
              </ol>
              <div v-if="sessionComplete" class="session-done">
                <h3>✦ ¡Sesión completada!</h3>
                <p>{{ session.items.length === 1 ? 'Cerraste el pendiente de tu tanda.' : 'Cerraste los ' + session.items.length + ' pendientes de tu tanda.' }}<template v-if="knownCount"> Te {{ knownCount === 1 ? 'queda 1 pendiente' : 'quedan ' + knownCount + ' pendientes' }} en total.</template><template v-else> ¡Ya no quedan pendientes vencidos!</template></p>
                <div class="session-actions">
                  <button v-if="sessionSize" type="button" class="pulse-primary" :disabled="sessionBusy" @click="startSession">Otra tanda</button>
                  <button type="button" @click="endSession">Terminar</button>
                </div>
              </div>
              <div v-else-if="sessionCurrent" class="session-current">
                <span class="session-badge" :class="'badge-' + sessionBadge(sessionCurrent).tone">{{ sessionBadge(sessionCurrent).text }}</span>
                <span class="session-area">{{ names[sessionCurrent.indicatorId] }}</span>
                <strong>{{ sessionCurrent.item.patientLabel || 'Paciente sin nombre registrado' }}</strong>
                <p>{{ itemWhen(sessionCurrent.item) }}<template v-if="sessionCurrent.item.oldestAgeDays !== null"> · {{ sessionCurrent.item.oldestAgeDays }} {{ sessionCurrent.item.oldestAgeDays === 1 ? 'día' : 'días' }} de atraso</template></p>
                <div class="session-actions">
                  <button type="button" class="pulse-primary" @click="openSessionItem(sessionCurrent)">Abrir y resolver →</button>
                  <button v-if="sessionPending > 1" type="button" @click="skipSessionItem(sessionCurrent)">Saltar por ahora</button>
                  <button type="button" :disabled="sessionBusy" @click="reconcileSessionNow(true)">{{ sessionBusy ? 'Comprobando…' : 'Comprobar avances' }}</button>
                  <button type="button" class="pulse-link-button" @click="endSession">Terminar sesión</button>
                </div>
              </div>
              <p v-if="!sessionComplete" class="pulse-muted">Un pendiente cuenta como cerrado cuando deja de aparecer en la lista actual. Si ya lo resolviste y no cambia, usa «Comprobar avances».</p>
            </template>
            <p v-if="sessionError" class="pulse-error" role="alert">{{ sessionError }}</p>
          </article>

          <article v-if="rescue" class="pulse-play-card play-rescue">
            <span class="pulse-kicker">Rescates de hoy</span>
            <h3>{{ rescue.total === 1 ? '1 pendiente pasa a prioridad en 24 horas' : rescue.total + ' pendientes pasan a prioridad en 24 horas' }}</h3>
            <p>Atenderlos hoy evita que suban de nivel. Es el mejor momento para ganarles.</p>
            <ul class="rescue-list">
              <li v-for="r in rescue.items" :key="r.indicatorId">
                <span><strong>{{ r.count }}</strong> {{ names[r.indicatorId] }}</span>
                <button v-if="canDetail(r.indicatorId)" type="button" class="pulse-link-button" @click="selectList(r.indicatorId)">Ver cuáles</button>
              </li>
            </ul>
          </article>

          <article class="pulse-play-card play-stamps">
            <span class="pulse-kicker">Sellos del día</span>
            <h3>{{ stampsTitle }}</h3>
            <ul class="stamp-list">
              <li v-for="s in stamps" :key="s.indicatorId" class="stamp" :class="['stamp-' + s.state, {'stamp-earned':s.earned,'stamp-pop':freshStamps.includes(s.indicatorId)}]">
                <span class="stamp-mark" aria-hidden="true">{{ s.state === 'clear' ? '✓' : s.state === 'open' ? s.remaining : '·' }}</span>
                <div><strong>{{ names[s.indicatorId] }}</strong><span>{{ stampText(s) }}</span></div>
              </li>
            </ul>
          </article>

          <article v-if="tomorrow" class="pulse-play-card play-tomorrow" :class="{'is-ready':tomorrow.ready}">
            <span class="pulse-kicker">Mañana lista · próximas 24 horas</span>
            <h3>{{ tomorrow.ready ? 'Mañana preparada ✓' : tomorrow.doneCount + ' de ' + tomorrow.items.length + ' listos' }}</h3>
            <div class="pulse-meter" aria-hidden="true"><span :style="{width: Math.round(100 * tomorrow.doneCount / Math.max(tomorrow.items.length, 1)) + '%'}"></span></div>
            <ul class="check-list">
              <li v-for="c in tomorrow.items" :key="c.key" :class="{'is-done':c.done}"><span aria-hidden="true">{{ c.done ? '✓' : '○' }}</span>{{ c.label }}</li>
            </ul>
            <button v-if="canOpenAgenda && !tomorrow.ready" type="button" class="pulse-link-button" @click="openAgenda">Abrir agenda de hoy</button>
            <p class="pulse-muted">Todavía no cuentan como pendientes vencidos.</p>
          </article>

          <article v-if="yesterday" class="pulse-play-card play-yesterday">
            <span class="pulse-kicker">Ayer en tu consultorio</span>
            <h3>{{ yesterday.total ? 'Lo que lograron ayer' : 'Ayer fue un día tranquilo' }}</h3>
            <ul v-if="yesterday.total" class="yesterday-list">
              <li v-for="y in yesterday.parts" :key="y.key"><strong>{{ y.value }}</strong><span>{{ y.label }}</span></li>
            </ul>
            <p v-else>No se registraron citas nuevas, recetas ni historias clínicas cerradas.</p>
            <p class="pulse-muted">Es contexto de tu trabajo, no una meta.</p>
          </article>
        </div>
      </section>

      <section id="pulse-priorities" class="pulse-section" aria-labelledby="pulse-priorities-title">
        <div class="pulse-section-heading">
          <span class="pulse-number">01</span>
          <div>
            <p class="pulse-kicker">Tu siguiente paso</p>
            <h2 id="pulse-priorities-title">Qué necesita tu atención</h2>
          </div>
          <span v-if="data && knownCount" class="pulse-count">{{ knownCount }} {{ knownCount === 1 ? 'pendiente por revisar' : 'pendientes por revisar' }}</span>
        </div>
        <p v-if="!data">Aquí encontrarás los pendientes y una forma de retomarlos.</p>
        <p v-else-if="!incidents.length && !st.applied.lastKnownUnresolved.length" class="pulse-empty">{{ data.quality.evaluated === 3 ? category === 'no_obligations' ? 'Cuando registres actividad, aquí aparecerá lo que necesite retomarse. No tener actividad no es un problema.' : 'No encontramos pendientes vencidos en los datos revisados. Puedes continuar con tu día.' : 'Por ahora no encontramos pendientes en los datos disponibles. Todavía falta información para confirmar el resto.' }}</p>

        <article v-for="item in incidentGroups" :id="'incident-' + item.indicatorId" :key="item.indicatorId" class="pulse-priority" :class="{'is-priority':item.priorityCount>0}" tabindex="-1">
          <div class="pulse-cause-count" aria-hidden="true"><strong>{{ item.count }}</strong><span>{{ item.priorityCount ? '◆' : '↗' }}</span></div>
          <div class="pulse-cause-copy">
            <span class="pulse-kicker">{{ item.priorityCount ? 'Atiende esto primero' : 'Para retomar' }} · {{ names[item.indicatorId] }}</span>
            <h3>{{ incidentTitle(item) }}</h3>
            <p>{{ reason(item.indicatorId, item.count) }} <span v-if="item.oldestAgeDays !== null">{{ ageText(item) }}</span></p>
            <div v-if="item.priorityCount && item.count > item.priorityCount" class="pulse-splitbar" aria-hidden="true">
              <span class="bar-priority" :style="{width: Math.round(100 * item.priorityCount / item.count) + '%'}"></span>
              <span class="bar-recent"></span>
            </div>
            <p v-if="item.priorityCount || rescueOf(item.indicatorId)" class="pulse-split">
              <span v-if="item.priorityCount" class="split-priority">{{ item.priorityCount }} con más de {{ priorityDays[item.indicatorId] }} días</span>
              <span v-if="item.priorityCount && item.count > item.priorityCount">{{ item.count - item.priorityCount }} {{ item.count - item.priorityCount === 1 ? 'más reciente' : 'más recientes' }}<template v-if="item.attentionAgeDays !== null"> (hasta {{ item.attentionAgeDays }} {{ item.attentionAgeDays === 1 ? 'día' : 'días' }})</template></span>
              <span v-if="rescueOf(item.indicatorId)" class="split-rescue">{{ rescueOf(item.indicatorId) }} {{ rescueOf(item.indicatorId) === 1 ? 'pasa' : 'pasan' }} a prioridad en 24 h</span>
            </p>
          </div>
          <button v-if="item.action" type="button" class="pulse-primary" @click="selectList(item.indicatorId)">{{ reviewLabel(item.indicatorId, item.count) }} <span aria-hidden="true">→</span></button>
          <p v-else class="pulse-muted">Necesitas acceso a este módulo para abrir los registros. Puedes pedirlo al administrador.</p>
        </article>

        <p v-for="item in visibleLastKnown" :key="'last-' + item.id" class="pulse-notice">{{ names[item.indicatorId] }}: en la lectura de las {{ formatClock(item.observedAt) }} había {{ item.count }} {{ item.count === 1 ? 'pendiente' : 'pendientes' }}. Aún no pudimos comprobar si {{ item.count === 1 ? 'se resolvió' : 'se resolvieron' }}.</p>

        <div v-if="selected" ref="incidentList" class="pulse-incidents" tabindex="-1">
          <div class="pulse-incidents-heading">
            <h3>{{ names[selected] }} por revisar</h3>
            <button type="button" :disabled="listBusy" @click="selectList(selected)">Actualizar lista</button>
          </div>
          <p class="pulse-muted">{{ list ? 'Lista consultada el ' + formatTime(list.asOf) + '. El resumen superior cambia cuando tú lo actualizas.' : 'Buscando los registros que puedes abrir…' }}</p>
          <p v-if="st.errors.list" class="pulse-error" role="alert">{{ friendlyError('list') }}</p>
          <p v-if="list && list.totalKnown === null">Faltan datos para confirmar el total. Estos son los registros que pudimos encontrar.</p>
          <p v-if="list && !list.items.length">Ya no hay registros en esta página. Actualiza el Pulso para comprobar qué cambió.</p>
          <ol v-if="list">
            <li v-for="item in list.items" :key="item.recordId" :class="{'row-priority':item.severity === 'priority'}">
              <div>
                <strong>{{ item.patientLabel || 'Paciente sin nombre registrado' }} · {{ item.severity === 'priority' ? 'Atender primero' : 'Por revisar' }}</strong><span v-if="item.rescue" class="pulse-badge-rescue">Pasa a prioridad en 24 h</span>
                <p>{{ itemWhen(item) }}<template v-if="item.oldestAgeDays !== null"> · {{ item.oldestAgeDays }} {{ item.oldestAgeDays === 1 ? 'día' : 'días' }} de atraso</template></p>
              </div>
              <button v-if="item.action" type="button" @click="openAction(item.action)">{{ reviewLabel(selected, 1) }} →</button>
            </li>
          </ol>
          <button v-if="list && list.nextCursor" type="button" :disabled="listBusy" @click="loadList(list.nextCursor)">Ver siguientes</button><span v-if="listBusy" role="status"> Buscando registros…</span>
        </div>
      </section>

      <section id="pulse-areas" class="pulse-section" aria-labelledby="pulse-dimensions">
        <div class="pulse-section-heading">
          <span class="pulse-number">02</span>
          <div>
            <p class="pulse-kicker">Detrás de cada señal</p>
            <h2 id="pulse-dimensions">Los pendientes, por área</h2>
          </div>
        </div>
        <p v-if="data" class="pulse-muted">{{ data.quality.evaluated === 3 ? 'Pudimos revisar las tres áreas con la información disponible.' : 'Hay áreas con información incompleta. Los pendientes que sí pudimos identificar siguen visibles.' }}</p>

        <div class="pulse-areas">
          <article v-for="id in ids" :key="id" class="pulse-area" :class="'dim-' + dimensionTone(id)">
            <div class="pulse-area-top">
              <div v-if="dimension(id)" class="pulse-ring" role="img" :aria-label="dimensionValue(id) + ' ' + dimensionCaption(id)">
                <svg viewBox="0 0 36 36" aria-hidden="true">
                  <circle class="ring-track" cx="18" cy="18" r="15.915" />
                  <circle class="ring-value" cx="18" cy="18" r="15.915" :stroke-dasharray="ringShare(id) + ' 100'" />
                </svg>
                <span aria-hidden="true">{{ ringMark(id) }}</span>
              </div>
              <div class="pulse-area-title">
                <h3 :id="'pulse-area-'+id" tabindex="-1">{{ names[id] }}</h3>
                <template v-if="dimension(id)">
                  <strong>{{ dimensionValue(id) }}</strong>
                  <span>{{ dimensionCaption(id) }}</span>
                </template>
              </div>
            </div>
            <p>{{ dimensionStory(id) }}</p>
            <div v-if="dimension(id)" class="pulse-area-notes">
              <small v-if="dimension(id).sample==='small'">Hay pocos registros; cada caso cuenta.</small>
              <small v-if="dimension(id).exclusions.archived">{{ dimension(id).exclusions.archived }} archivados, sin confirmar que se resolvieran.</small>
              <small v-if="source(id) && source(id).status!=='fresh'">No pudimos consultar esta área en la última lectura.</small>
              <small v-else-if="source(id) && source(id).invalidRecords">{{ source(id).invalidRecords }} {{ source(id).invalidRecords === 1 ? 'registro tiene datos que no podemos evaluar' : 'registros tienen datos que no podemos evaluar' }}.</small>
              <button v-if="source(id) && source(id).invalidRecords && canDetail(id)" type="button" class="pulse-link-button" :disabled="invalid.busy === id" @click="loadInvalid(id)">{{ invalid.busy === id ? 'Buscando…' : invalid.lists[id] ? 'Actualizar registros por corregir' : 'Ver qué corregir' }}</button>
            </div>
          </article>
        </div>

        <template v-for="id in ids">
          <div v-if="invalid.lists[id] || invalid.errors[id]" :id="'pulse-invalid-' + id" :key="'invalid-' + id" class="pulse-invalid" tabindex="-1">
            <strong class="pulse-invalid-title">{{ names[id] }} · registros por corregir</strong>
            <p v-if="invalid.errors[id]" class="pulse-error" role="alert">{{ invalid.errors[id] }}</p>
            <template v-else>
              <p class="pulse-muted">Al corregir estos datos, el área vuelve a evaluarse completa. Lista consultada el {{ formatTime(invalid.lists[id].asOf) }}.</p>
              <p v-if="!invalid.lists[id].items.length">Ya no encontramos registros con datos por corregir. Actualiza el Pulso para comprobarlo.</p>
              <ul>
                <li v-for="item in invalid.lists[id].items" :key="item.recordId">
                  <div>
                    <strong>{{ item.patientLabel || 'Registro sin paciente vinculado' }}</strong>
                    <p>{{ invalidReasonText(id, item.invalidReason) }}<template v-if="item.appointmentDate"> · Cita del {{ formatCivil(item.appointmentDate) }}<template v-if="item.startTime"> · {{ item.startTime }}</template></template></p>
                  </div>
                  <button v-if="item.action" type="button" @click="openAction(item.action)">Abrir registro →</button>
                  <span v-else class="pulse-muted">Pide apoyo al administrador para revisarlo.</span>
                </li>
              </ul>
              <p v-if="invalid.lists[id].truncated" class="pulse-muted">Mostramos los primeros {{ invalid.lists[id].items.length }} registros.</p>
            </template>
          </div>
        </template>
      </section>

      <section class="pulse-section" aria-labelledby="pulse-preparation">
        <div class="pulse-section-heading">
          <span class="pulse-number">03</span>
          <div>
            <p class="pulse-kicker">Para usar tus herramientas</p>
            <h2 id="pulse-preparation" tabindex="-1">Configuración para trabajar</h2>
          </div>
        </div>
        <p>{{ data ? preparationSummary : 'Revisamos si tus herramientas tienen la configuración necesaria.' }}</p>
        <template v-if="data">
          <div v-if="mission" class="pulse-mission" :class="{'mission-done':mission.complete}">
            <div>
              <span class="pulse-kicker">Misión de arranque</span>
              <strong>{{ mission.complete ? '✦ ¡Consultorio listo! Todo lo necesario está configurado.' : 'Tu consultorio listo: ' + mission.ready + ' de ' + mission.total }}</strong>
            </div>
            <div class="pulse-meter" role="img" :aria-label="mission.ready + ' de ' + mission.total + ' configuraciones necesarias completas'"><span :style="{width: Math.round(100 * mission.ready / mission.total) + '%'}"></span></div>
          </div>
          <details v-if="mission && mission.complete" class="pulse-history-details">
            <summary>Ver qué se comprobó</summary>
            <div class="pulse-preparation-list">
              <article v-for="item in data.preparation.items" :key="item.id" class="pulse-preparation" :class="'prep-' + preparationTone(item)">
                <span class="prep-mark" aria-hidden="true">{{ preparationMark(item) }}</span>
                <div>
                  <strong>{{ preparationName(item.id) }}</strong>
                  <span>{{ item.class === 'necessary' ? item.ready === true ? 'Configuración completa' : 'Configuración pendiente' : item.class === 'optional' ? 'A tu elección' : 'Todavía por confirmar' }}</span>
                  <p v-if="item.tasks.length && item.ready!==true">{{ item.class==='necessary' ? 'Hace falta para ' : 'Puede ser necesario para ' }}{{ item.tasks.map(taskName).join(', ') }}.</p>
                  <p class="pulse-muted">{{ preparationHelp(item) }}</p>
                </div>
                <button v-if="item.action" type="button" @click="openAction(item.action)">Revisar configuración →</button>
              </article>
            </div>
          </details>
          <div v-else class="pulse-preparation-list">
            <article v-for="item in data.preparation.items" :key="item.id" class="pulse-preparation" :class="'prep-' + preparationTone(item)">
              <span class="prep-mark" aria-hidden="true">{{ preparationMark(item) }}</span>
              <div>
                <strong>{{ preparationName(item.id) }}</strong>
                <span>{{ item.class === 'necessary' ? item.ready === true ? 'Configuración completa' : 'Configuración pendiente' : item.class === 'optional' ? 'A tu elección' : 'Todavía por confirmar' }}</span>
                <p v-if="item.tasks.length && item.ready!==true">{{ item.class==='necessary' ? 'Hace falta para ' : 'Puede ser necesario para ' }}{{ item.tasks.map(taskName).join(', ') }}.</p>
                <p class="pulse-muted">{{ preparationHelp(item) }}</p>
              </div>
              <button v-if="item.action" type="button" @click="openAction(item.action)">Revisar configuración →</button>
            </article>
          </div>
        </template>
      </section>

      <section id="pulse-progress" class="pulse-section" aria-labelledby="pulse-evolution">
        <div class="pulse-section-heading">
          <span class="pulse-number">04</span>
          <div>
            <p class="pulse-kicker">De un día a otro</p>
            <h2 id="pulse-evolution">Rachas, récords y tu última semana</h2>
          </div>
        </div>
        <p>Tus rachas y récords se calculan con los resúmenes de los últimos 30 días; las barras muestran la última semana. Para periodos más largos usa Análisis del consultorio.</p>
        <p class="pulse-muted">Los resúmenes diarios toman como referencia las 18:00, hora del consultorio. Son una revisión de los pendientes a esa hora, no un cierre de jornada.</p>
        <p v-if="st.errors.history" class="pulse-error" role="alert">{{ friendlyError('history') }} <button type="button" :disabled="historyBusy" @click="loadHistory">Volver a intentar</button></p>
        <p v-if="historyBusy" role="status">Buscando resúmenes anteriores…</p>

        <template v-if="st.history">
          <p v-if="!st.history.series.length" class="pulse-empty">Aún no hay resúmenes guardados para este periodo. Por ahora, usa el Pulso actual para decidir qué atender. Cuando haya historial, aquí podrás comparar los pendientes de cada día.</p>
          <template v-else>
            <div class="pulse-progress">
              <div class="pulse-stat" :class="{'stat-good':streak.current>0}">
                <span class="pulse-kicker">Racha</span>
                <strong>{{ streak.current }} {{ streak.current === 1 ? 'día' : 'días' }}</strong>
                <p>{{ streakText }}</p>
                <small>Mejor racha en estos 30 días: {{ streak.best }} {{ streak.best === 1 ? 'día' : 'días' }}.</small>
              </div>
              <div v-if="progress" class="pulse-stat" :class="progressTone">
                <span class="pulse-kicker">Desde el último resumen</span>
                <strong>{{ progress.delta > 0 ? '+' : '' }}{{ progress.delta }} {{ Math.abs(progress.delta) === 1 ? 'pendiente' : 'pendientes' }}</strong>
                <p>{{ progress.before }} el {{ formatCivil(progress.from) }} a las 18:00 · {{ progress.now }} en esta lectura.</p>
                <small>{{ progressMessage }} Es una referencia: compara un corte diario con la lectura actual.</small>
              </div>
              <div v-if="records" class="pulse-stat" :class="{'stat-good':records.beatsLowest}">
                <span class="pulse-kicker">Tus récords</span>
                <strong>{{ records.beatsLowest ? '✦ ¡Nuevo mínimo!' : records.lowest.total + ' ' + (records.lowest.total === 1 ? 'pendiente' : 'pendientes') }}</strong>
                <p>{{ recordText }}</p>
                <small>Solo te comparamos con tus propios resúmenes.</small>
              </div>
            </div>

            <ul class="pulse-area-streaks" aria-label="Rachas por área">
              <li v-for="a in areaStreakList" :key="a.indicatorId" :class="{'has-streak':a.current>0}">
                <strong>{{ names[a.indicatorId] }}</strong>
                <span>{{ a.liveBlocked ? 'Hoy hay una prioridad; al resolverla empieza otra racha' : a.current ? a.current + ' ' + (a.current === 1 ? 'día' : 'días') + ' sin prioridad' : 'La racha empieza con el próximo resumen sin prioridad' }}</span>
                <small>Mejor: {{ a.best }} {{ a.best === 1 ? 'día' : 'días' }}</small>
              </li>
            </ul>

            <div class="pulse-trends" role="group" aria-label="Pendientes vencidos por día">
              <div v-for="row in trendRows" :key="row.id" class="pulse-trend">
                <span class="pulse-trend-name">{{ names[row.id] }}</span>
                <svg :viewBox="'0 0 ' + (row.bars.length * 10) + ' 40'" preserveAspectRatio="none" class="pulse-trend-chart" role="img" :aria-label="row.label">
                  <g v-for="(bar, i) in row.bars" :key="bar.date">
                    <rect v-if="bar.value !== null" :x="i * 10 + 1.5" :y="38 - bar.height" width="7" :height="Math.max(bar.height, bar.value === 0 ? 1.5 : 2)" rx="1.5" :class="['trend-bar', 'trend-' + bar.tone, {'trend-partial': bar.partial, 'trend-live': bar.live}]"><title>{{ bar.title }}</title></rect>
                    <rect v-else :x="i * 10 + 3.5" y="36.5" width="3" height="1.5" class="trend-gap"><title>{{ bar.title }}</title></rect>
                  </g>
                </svg>
                <span class="pulse-trend-last">{{ row.lastText }}</span>
              </div>
              <p class="pulse-muted">Cada barra es el resumen de las 18:00; la última es la lectura actual. Las marcas grises son días sin resumen y las barras claras, días con datos incompletos.</p>
            </div>

            <details class="pulse-history-details">
              <summary>Ver detalle por día</summary>
              <div v-for="point in historyNewestFirst" :key="point.localDate" class="pulse-history">
                <strong>{{ formatCivil(point.localDate) }}</strong>
                <span>{{ point.state === 'valid' ? 'Resumen guardado' : 'Resumen con datos incompletos' }}{{ point.comparableToPrevious ? ' · Comparable con el resumen anterior' : '' }}</span>
                <small>{{ point.dimensions.map(d => names[d.id] + ': ' + (d.numerator === null ? 'sin dato' : d.numerator + ' de ' + d.denominator + ' vencidos')).join(' · ') }}</small>
              </div>
            </details>
            <p v-if="weekMissing" class="pulse-muted">Hay {{ weekMissing }} {{ weekMissing === 1 ? 'día sin resumen' : 'días sin resumen' }} en esta semana. No sabemos cómo estaban los pendientes en esas fechas.</p>
          </template>
        </template>

        <div v-if="data && data.activity.available" class="pulse-activity">
          <span class="pulse-kicker">Actividad de los últimos 7 días completos</span>
          <ul>
            <li v-for="item in activityItems" :key="item.key"><strong>{{ item.value === null ? '—' : item.value }}</strong><span>{{ item.label }}</span></li>
          </ul>
          <p class="pulse-muted">Dan contexto a tu trabajo; no indican cuántos pendientes se resolvieron.</p>
        </div>
        <p v-if="data && data.quality.limitations.length" class="pulse-muted">{{ data.quality.limitations.map(limitationText).join(' ') }}</p>
        <router-link v-if="canAnalyze" class="pulse-analysis-link" :to="{name:'dashboard'}">Ver periodos completos e indicadores en Análisis del consultorio →</router-link>
      </section>
    </template>
  </div>
</template>

<script>
import PulseBackdrop from './PulseBackdrop.vue';
import service from '../../services/core/business/DABusinessPulseService';
import { PRIORITY_DAYS, DETAIL_PERMISSIONS, SESSION_SIZE, groupIncidents, unresolvedNotShown, streakFromHistory, areaStreaks, personalRecords, rescueSummary, areaStamps, tomorrowChecklist, yesterdaySummary, setupMission, buildSessionQueue, reconcileSession, progressSinceSummary, trendBars, civilDate, INVALID_REASONS } from '../../domain/pulse/pulseInsights';
import { canAccessPulse } from '../../security/pulseAccess';
import { createReader, pulseContext, serverTime, actionTarget, names, categories, INDICATORS } from '../../domain/pulse/pulseReader';
import { storyFor, appointmentOutcomeText, refreshSummary } from '../../domain/pulse/pulseStory';
export default {
  name: 'BusinessPulse', components: { PulseBackdrop },
  data: () => ({ names, categories, ids: INDICATORS, busy: false, verifying: false, recognition: 0, historyBusy: false, listBusy: false, selected: null, selectedFocus: null, list: null, announcement: '', tick: 0, priorityDays: PRIORITY_DAYS, invalid: { lists: {}, errors: {}, busy: null }, sessionBusy: false, sessionError: '', freshStamps: [], celebration: '' }),
  computed: {
    auth() { return this.$store.state.CORE.AUTH; }, st() { return this.$store.state.CORE.PULSE; }, context() { return pulseContext(this.auth); },
    allowed() { return canAccessPulse(this.auth.permissions, this.auth.role) && (!this.auth.tenantOperational || this.auth.tenantOperational.allowed !== false); },
    data() { return this.allowed && !this.st.denied ? this.st.applied : null; },
    currentTime() { void this.tick; return serverTime(this.st.clock, performance.now()); },
    expired() { return this.data && this.currentTime >= Date.parse(this.data.snapshot.validUntil); },
    stale() { return this.data && this.currentTime - Date.parse(this.data.snapshot.calculatedAt) >= 120000; },
    expiredCandidate() { return !this.st.candidate || this.currentTime >= Date.parse(this.st.candidate.snapshot.validUntil); },
    category() { return this.data ? this.data.operational.category : 'not_evaluable'; },
    story() { return storyFor(this.data); },
    verifiedResult() { return this.st.appointmentOutcome && this.st.appointmentOutcome.kind === 'verified'; },
    outcomeTitle() { return this.verifiedResult ? appointmentOutcomeText[this.st.appointmentOutcome.status] : ''; },
    agendaResultText() {
      const dimension = this.dimension('PUL-OP03'), source = this.source('PUL-OP03');
      if (dimension && dimension.numerator > 0) return 'Este pendiente ya tiene resultado. Las demás citas por revisar conservan su señal.';
      if (!dimension || dimension.numerator === null || !source || source.status !== 'fresh' || source.integrity !== 'checked') return 'Este pendiente ya tiene resultado. Aún falta información para confirmar el resto de la agenda.';
      return 'Ya no encontramos citas pasadas sin un resultado registrado. La zona de agenda recupera su ritmo.';
    },
    preparationSummary() {
      const preparation = this.data.preparation;
      const tasks = [...new Set(preparation.items.filter(item => item.class === 'necessary' && (preparation.state === 'blocked' ? item.ready === false : item.ready === true)).reduce((all,item) => all.concat(item.tasks), []))].map(this.taskName);
      const list = tasks.length < 2 ? tasks[0] : tasks.slice(0,-1).join(', ') + ' y ' + tasks[tasks.length-1];
      if (preparation.state === 'blocked') return list ? 'Faltan ajustes para ' + list + '. Revisa abajo qué necesitas completar.' : 'Hay ajustes pendientes en la configuración. Revisa abajo qué necesitas completar.';
      if (preparation.state === 'ready') return list ? 'La configuración revisada para ' + list + ' está completa. Abajo puedes ver qué se comprobó.' : 'No encontramos ajustes pendientes en la configuración revisada. Abajo puedes ver qué se comprobó.';
      return 'Aún no pudimos confirmar toda la configuración. Abajo puedes ver qué está listo y qué falta comprobar.';
    },
    incidents() { return this.data ? [...this.data.incidents].sort((a,b) => (b.severity === 'priority') - (a.severity === 'priority') || b.oldestAgeDays - a.oldestAgeDays) : []; },
    incidentGroups() { return groupIncidents(this.data ? this.data.incidents : []); },
    visibleLastKnown() { return this.data ? unresolvedNotShown(this.data) : []; },
    rescue() { return this.data ? rescueSummary(this.data) : null; },
    stamps() { return areaStamps(this.data, this.st.history); },
    stampStates() { return this.stamps.map(s => s.indicatorId + ':' + s.state).join('|'); },
    stampsTitle() { const clear = this.stamps.filter(s => s.state === 'clear').length, open = this.stamps.filter(s => s.state === 'open').length; if (!open && clear) return clear === this.stamps.length ? '¡Las tres áreas al día!' : '¡Todo al día!'; return clear ? clear + ' de ' + (clear + open) + ' áreas al día' : open === 1 ? 'Un área por dejar al día' : open ? open + ' áreas por dejar al día' : 'Todavía sin sellos que entregar'; },
    tomorrow() { return this.data ? tomorrowChecklist(this.data.activity) : null; },
    yesterday() { return this.data ? yesterdaySummary(this.data.activity) : null; },
    mission() { return this.data ? setupMission(this.data.preparation) : null; },
    areaStreakList() { return areaStreaks(this.st.history, this.data); },
    records() { return personalRecords(this.st.history, this.data); },
    recordText() { const r = this.records; if (!r) return ''; if (r.beatsLowest) return 'Ahora tienes ' + r.live + ' ' + (r.live === 1 ? 'pendiente' : 'pendientes') + ': menos que en cualquiera de tus ' + r.days + ' resúmenes recientes (el mínimo era ' + r.lowest.total + ').'; return 'Tu día con menos pendientes entre tus ' + r.days + ' resúmenes recientes fue el ' + this.formatCivil(r.lowest.date) + '.' + (r.live !== null ? ' Ahora: ' + r.live + '.' : ''); },
    livePriority() { return this.incidents.some(i => i.severity === 'priority'); },
    todayKey() { if (!this.data) return null; try { return new Intl.DateTimeFormat('en-CA', { timeZone: this.data.snapshot.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(this.data.snapshot.calculatedAt)); } catch (_) { return null; } },
    openableCount() { return this.incidentGroups.filter(g => g.action && this.canDetail(g.indicatorId)).reduce((n, g) => n + g.count, 0); },
    sessionSize() { return Math.min(SESSION_SIZE, this.openableCount); },
    session() { const s = this.st.session; return s && s.context === this.context.key && s.date === this.todayKey ? s : null; },
    sessionDone() { return this.session ? this.session.items.filter(i => i.done).length : 0; },
    sessionPending() { return this.session ? this.session.items.filter(i => !i.done).length : 0; },
    sessionComplete() { return Boolean(this.session && this.session.items.length && !this.sessionPending); },
    sessionCurrent() { if (!this.session) return null; const open = this.session.items.filter(i => !i.done); return open.find(i => !i.skipped) || open[0] || null; },
    dataKey() { return this.data ? this.data.snapshot.calculatedAt : ''; },
    canOpenAgenda() { return (this.auth.permissions || []).includes('px.dates'); },
    streak() { return streakFromHistory(this.st.history, this.data); },
    streakText() { if (this.streak.liveBlocked) return 'Hoy hay pendientes con más días de los recomendados. Al resolverlos empieza una nueva racha.'; if (this.streak.current) return 'Resúmenes diarios seguidos sin pendientes que atender primero. ¡Sigue así!'; return 'La racha cuenta los resúmenes diarios sin pendientes que atender primero. Un día sin resumen la interrumpe.'; },
    progress() { return progressSinceSummary(this.st.history, this.data); },
    progressTone() { return !this.progress ? '' : this.progress.delta < 0 ? 'stat-good' : this.progress.delta > 0 ? 'stat-warn' : ''; },
    progressMessage() { return !this.progress ? '' : this.progress.delta < 0 ? 'Vas reduciendo lo acumulado.' : this.progress.delta > 0 ? 'Se acumularon pendientes desde entonces.' : 'Sin cambios en el total.'; },
    trendDays() { return this.st.history ? [...this.st.history.series.map(p => p.localDate), ...this.st.history.missingDates].sort().slice(-7) : []; },
    weekMissing() { return this.st.history ? this.st.history.missingDates.filter(d => this.trendDays.includes(d)).length : 0; },
    trendRows() { return this.ids.map(id => trendBars(id, this.st.history, this.data, this.trendDays, this.names[id], this.formatCivil)); },
    historyNewestFirst() { return this.st.history ? this.st.history.series.filter(p => this.trendDays.includes(p.localDate)).sort((a, b) => b.localDate.localeCompare(a.localDate)) : []; },
    activityItems() { const c = (this.data && this.data.activity.counts) || {}; return [{ key: 'appointmentsCreated', label: 'citas creadas', value: c.appointmentsCreated }, { key: 'prescriptionsIssued', label: 'recetas emitidas', value: c.prescriptionsIssued }, { key: 'clinicalHistoriesFinalized', label: 'historias clínicas finalizadas', value: c.clinicalHistoriesFinalized }].map(i => ({ ...i, value: Number.isFinite(i.value) ? i.value : null })); },
    knownCount() { return this.incidents.reduce((n,i) => n + i.count, 0); },
    priorityTotal() { return this.incidentGroups.reduce((n, g) => n + g.priorityCount, 0); },
    // Glanceable figures for the hero. Each one links to the section that explains it.
    vitals() {
      if (!this.data) return [];
      const rescues = this.rescue ? this.rescue.total : 0, streak = this.streak;
      return [
        { key: 'pending', value: this.knownCount, label: this.knownCount === 1 ? 'pendiente por revisar' : 'pendientes por revisar', hint: this.data.quality.evaluated === 3 ? 'en las tres áreas revisadas' : 'en los datos disponibles', tone: this.knownCount ? 'attention' : 'calm', target: 'pulse-priorities' },
        { key: 'priority', value: this.priorityTotal, label: 'para atender primero', hint: 'con más días de los recomendados', tone: this.priorityTotal ? 'priority' : 'calm', target: 'pulse-priorities' },
        { key: 'rescue', value: rescues, label: rescues === 1 ? 'pasa a prioridad en 24 h' : 'pasan a prioridad en 24 h', hint: 'atenderlos hoy evita que suban de nivel', tone: rescues ? 'attention' : 'calm', target: 'pulse-play' },
        { key: 'streak', value: streak.current, label: streak.current === 1 ? 'día de racha' : 'días de racha', hint: 'resúmenes seguidos sin prioridad · mejor: ' + streak.best, tone: streak.current ? 'good' : 'calm', target: 'pulse-progress' }
      ];
    },
    sectionLinks() {
      const mission = this.mission, missing = mission && !mission.complete ? mission.total - mission.ready : 0;
      return [
        ...(this.data ? [{ target: 'pulse-play', label: 'Tu jugada de hoy', mark: '✦' }] : []),
        { target: 'pulse-priorities', label: 'Qué necesita tu atención', mark: '01', count: this.data ? this.knownCount : 0 },
        { target: 'pulse-areas', label: 'Por área', mark: '02' },
        { target: 'pulse-preparation', label: 'Configuración', mark: '03', count: missing },
        { target: 'pulse-progress', label: 'Rachas y última semana', mark: '04' }
      ];
    },
    scenePriorities() { return this.ids.map(id => { const items = this.incidents.filter(i=>i.indicatorId===id); if (!items.length) return null; const item = {...items[0],count:items.reduce((n,i)=>n+i.count,0),oldestAgeDays:Math.max(...items.map(i=>i.oldestAgeDays || 0))}; return {indicatorId:id,title:this.incidentTitle(item),description:this.reason(id,item.count)+' '+this.ageText(item),actionLabel:item.action?this.reviewLabel(id,item.count):null}; }).filter(Boolean); },
    sceneNotes() {
      if (!this.data) return [];
      const notes = [], zoneMissing = this.data.snapshot.timeZoneSource === 'fallback';
      const unread = this.ids.filter(id => !this.source(id) || this.source(id).status !== 'fresh');
      if (unread.length) notes.push({id:'sources',title:'No pudimos consultar '+unread.map(id=>this.names[id].toLowerCase()).join(' y '),message:'Los pendientes que conocíamos antes siguen sin darse por resueltos. Actualiza el Pulso para volver a intentar la consulta.',action:'refresh'});
      if (zoneMissing) notes.push({id:'timezone',title:'Falta comprobar la zona horaria del consultorio',message:'Sin una zona horaria confirmada no podemos evaluar todos los plazos de seguimientos y citas.',target:'pulse-preparation',actionLabel:'Ver configuración'});
      this.ids.forEach(id => {
        const source = this.source(id);
        if (!source || source.status !== 'fresh' || source.integrity === 'checked') return;
        if (source.invalidRecords > 0) notes.push({id:'integrity-'+id,title:this.names[id]+': '+source.invalidRecords+' '+(source.invalidRecords===1?'registro tiene datos por corregir':'registros tienen datos por corregir'),message:'Mientras no se corrija'+(source.invalidRecords===1?'':'n')+' no podemos dar el área por revisada completa. Los pendientes que sí conocemos siguen visibles.',target:this.canDetail(id)?'pulse-invalid-'+id:'pulse-area-'+id,actionLabel:this.canDetail(id)?'Ver qué corregir':'Ver el área'});
        else if (!zoneMissing || id === 'PUL-OP02') notes.push({id:'integrity-'+id,title:'No pudimos comprobar todos los datos de '+this.names[id].toLowerCase(),message:'Podemos mostrar los pendientes conocidos, pero todavía no confirmar el resto de estos registros.',target:'pulse-area-'+id,actionLabel:'Ver qué revisamos'});
      });
      const preparation = this.data.preparation;
      preparation.items.filter(item=>item.class==='necessary' && item.ready===false && !(zoneMissing && item.id==='clinic-timezone')).forEach(item=>notes.push({id:'preparation-'+item.id,title:'Configuración pendiente: '+this.preparationName(item.id),message:this.preparationHelp(item)+(item.tasks.length?' Hace falta para '+item.tasks.map(this.taskName).join(', ')+'.':''),target:'pulse-preparation',actionLabel:'Ver paso pendiente'}));
      if (!['ready','blocked'].includes(preparation.state)) {
        const noEvidence = preparation.items.some(item=>item.id==='functions-not-confirmed');
        notes.push({id:'preparation',title:noEvidence?'Falta identificar qué herramientas requieren configuración':'No pudimos comprobar toda la configuración',message:noEvidence?'Todavía no hay evidencia de una función en uso que necesite configuración. No significa que tengas un paso incumplido.':'No pudimos confirmar todos los requisitos de las herramientas utilizadas. Revisa abajo qué pudimos comprobar.',target:'pulse-preparation',actionLabel:'Ver configuración'});
      }
      const archived = this.ids.filter(id=>this.dimension(id) && this.dimension(id).exclusions.archived > 0);
      if (archived.length) notes.push({id:'archived',title:'Hay registros archivados fuera de esta evaluación',message:archived.map(id=>this.names[id]+': '+this.dimension(id).exclusions.archived).join(' · ')+'. Ya no se evalúan como activos; archivarlos no confirma que se hayan resuelto.',target:'pulse-area-'+archived[0],actionLabel:'Ver área afectada'});
      return notes;
    },
    skyVisual() { return { ...this.data.visual, archiveCaution: this.data.dimensions.some(d => d.exclusions.archived > 0), causes: this.data.visual.causes.map(c => ({ ...c, lastKnownSeverity: (this.data.lastKnownUnresolved.find(i => i.indicatorId === c.dimensionId) || {}).lastSeverity || null })) }; },
    canAnalyze() { return (this.auth.permissions || []).some(p => ['dashboard.operations','dashboard.clinical','dashboard.financial','dashboard'].includes(p)); },
    activityText() { const c = this.data.activity.counts || {}; const count = (n,one,many) => n == null ? 'sin datos de ' + many : n + ' ' + (n === 1 ? one : many); return count(c.appointmentsCreated,'cita creada','citas creadas') + ', ' + count(c.prescriptionsIssued,'receta emitida','recetas emitidas') + ' y ' + count(c.clinicalHistoriesFinalized,'historia clínica finalizada','historias clínicas finalizadas'); }
  },
  watch: {
    stampStates(next, prev) {
      if (!prev || !next) return;
      const before = Object.fromEntries(prev.split('|').map(x => x.split(':'))), reached = next.split('|').map(x => x.split(':')).filter(([id, state]) => state === 'clear' && before[id] === 'open').map(([id]) => id);
      if (!reached.length) return;
      this.freshStamps = [...new Set([...this.freshStamps, ...reached])];
      const list = reached.map(id => this.names[id]).join(' y ');
      this.announcement = list + (reached.length === 1 ? ' quedó al día.' : ' quedaron al día.');
      this.celebration = this.livePriority ? '' : '¡' + list + ' al día! Buen trabajo.';
    },
    dataKey(value) { if (value && this.session && !this.sessionComplete) this.reconcileSessionNow(false); },
    sessionComplete(value) { if (value) this.announcement = '¡Sesión completada! Cerraste los pendientes de tu tanda.'; },
    'context.key'() { this.restart(); }, allowed(value) { if (!value) this.restart(); }, 'st.denied'(value) { if (value) { this.list = null; this.selected = null; this.selectedFocus = null; this.listBusy = false; clearInterval(this.timer); } } },
  created() { this.listRequest = 0; this.reader = createReader({ service, state: () => this.st, commit: (type,payload) => this.$store.commit('CORE/PULSE/' + type,payload), context: () => this.context }); },
  mounted() { this.start(); }, activated() { if (!this.running) this.start(); },
  deactivated() { this.stop(); }, beforeDestroy() { this.stop(); },
  methods: {
    canDetail(id) { const codes = this.auth.permissions || []; return (DETAIL_PERMISSIONS[id] || []).every(code => codes.includes(code)); },
    async loadInvalid(id) {
      if (!this.canDetail(id) || this.invalid.busy) return;
      const context = this.context.key; this.invalid.busy = id; this.$set(this.invalid.errors, id, '');
      try {
        const r = await service.incidents(id, null, undefined, 'invalid');
        if (!this.running || this.context.key !== context) return;
        if (!r || !r.success || !r.data || r.data.indicatorId !== id || !Array.isArray(r.data.items)) { this.$set(this.invalid.errors, id, [401,403].includes(r && r.status) ? 'No tienes acceso para abrir estos registros. Pide apoyo al administrador.' : 'No pudimos consultar los registros por corregir. Vuelve a intentarlo.'); this.$delete(this.invalid.lists, id); return; }
        this.$set(this.invalid.lists, id, r.data);
        this.$nextTick(() => { const el = document.getElementById('pulse-invalid-' + id); if (el) { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); } });
      } finally { if (this.invalid.busy === id) this.invalid.busy = null; }
    },
    rescueOf(id) { const d = this.dimension(id); return d && Number.isFinite(d.rescueCount) ? d.rescueCount : 0; },
    stampText(s) { if (s.state === 'clear') return s.earned ? '¡Lo dejaste al día! En el resumen del ' + this.formatCivil(s.since) + ' había ' + s.before + '.' : 'Al día'; if (s.state === 'open') return s.remaining === 1 ? 'Falta 1 para el sello' : 'Faltan ' + s.remaining + ' para el sello'; if (s.state === 'empty') return 'Sin registros por revisar'; return 'Por confirmar con datos completos'; },
    sessionBadge(entry) { return entry.severity === 'priority' ? { tone: 'priority', text: 'Atender primero' } : entry.rescue ? { tone: 'rescue', text: 'Pasa a prioridad en 24 h' } : { tone: 'attention', text: 'Por revisar' }; },
    async fetchSessionLists(ids, limit) {
      const out = {};
      await Promise.all(ids.map(async id => { const r = await service.incidents(id, null, undefined, 'pending', limit); if (r && r.success && r.data && r.data.indicatorId === id && Array.isArray(r.data.items)) out[id] = r.data; }));
      return out;
    },
    async startSession() {
      if (this.sessionBusy || !this.data) return;
      const context = this.context.key, date = this.todayKey; this.sessionBusy = true; this.sessionError = ''; this.celebration = '';
      try {
        const ids = this.incidentGroups.filter(g => g.action && g.count && this.canDetail(g.indicatorId)).map(g => g.indicatorId);
        const lists = await this.fetchSessionLists(ids, 20);
        if (!this.running || this.context.key !== context) return;
        const items = buildSessionQueue(ids.map(id => lists[id]).filter(Boolean));
        if (!items.length) { this.sessionError = Object.keys(lists).length === ids.length ? 'Ya no encontramos pendientes que puedas abrir. Actualiza el Pulso para comprobarlo.' : 'No pudimos preparar tu tanda. Vuelve a intentarlo.'; return; }
        this.$store.commit('CORE/PULSE/session', { context, date, startedAt: Date.now(), items });
        this.$nextTick(() => { const el = document.getElementById('pulse-session'); if (el) el.focus({ preventScroll: true }); });
      } finally { if (this.running) this.sessionBusy = false; }
    },
    async reconcileSessionNow(manual) {
      if (this.sessionBusy || !this.session) return;
      const session = this.session, context = this.context.key; this.sessionBusy = true; if (manual) this.sessionError = '';
      try {
        const ids = [...new Set(session.items.filter(i => !i.done).map(i => i.indicatorId))];
        const lists = await this.fetchSessionLists(ids, 50);
        if (!this.running || this.context.key !== context || this.st.session !== session) return;
        if (manual && Object.keys(lists).length < ids.length) this.sessionError = 'No pudimos comprobar todos los avances. Vuelve a intentarlo.';
        const items = reconcileSession(session.items, lists), closed = items.filter(i => i.done).length - session.items.filter(i => i.done).length;
        this.$store.commit('CORE/PULSE/session', { ...session, items });
        if (closed > 0 && items.some(i => !i.done)) this.announcement = '¡Bien! ' + (closed === 1 ? '1 pendiente cerrado' : closed + ' pendientes cerrados') + ' en tu sesión.';
        else if (manual && !closed) this.announcement = 'Todavía no vemos cambios en tu tanda. Si guardaste algo, espera unos segundos y vuelve a comprobar.';
      } finally { if (this.running) this.sessionBusy = false; }
    },
    openSessionItem(entry) { this.selected = entry.indicatorId; this.selectedFocus = 'pulse-session'; this.openAction(entry.item.action); },
    skipSessionItem(entry) { const s = this.session; if (!s) return; const items = s.items.filter(i => i !== entry).concat([{ ...entry, skipped: true }]); this.$store.commit('CORE/PULSE/session', { ...s, items }); },
    endSession() { this.$store.commit('CORE/PULSE/session', null); this.sessionError = ''; },
    invalidReasonText(id, reason) { return (INVALID_REASONS[id] && INVALID_REASONS[id][reason]) || 'Tiene datos que no permiten evaluarlo.'; },
    itemWhen(item) {
      if (item.indicatorId === 'PUL-OP03' && item.appointmentDate) return 'Cita del ' + this.formatCivil(item.appointmentDate) + (item.startTime ? ' · ' + item.startTime : '') + (item.doctorLabel ? ' · ' + item.doctorLabel : '');
      if (item.timeBasis === 'business_civil_date') return 'Fecha prevista: ' + this.formatCivil(item.dueDate);
      return 'Venció el ' + this.formatTime(item.overdueSince);
    },
    formatCivil(value) { return civilDate(value); },
    formatClock(value) { const date = new Date(value); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('es-MX', { timeZone: this.data ? this.data.snapshot.timeZone : 'America/Mexico_City', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date) : 'una lectura anterior'; },
    dimensionValue(id) { const d = this.dimension(id); if (!d || d.numerator === null) return 'Por confirmar'; if (!d.denominator) return 'Sin registros'; if (!d.numerator) return 'Al día'; return d.numerator + ' de ' + d.denominator; },
    dimensionCaption(id) { const d = this.dimension(id); if (!d || d.numerator === null) return 'Faltan datos para revisar estos registros'; if (!d.denominator) return 'No hay registros que revisar todavía'; if (!d.numerator) return d.denominator + ' revisados, ninguno vencido'; return 'con el plazo vencido (' + Math.round(100 * d.numerator / d.denominator) + '%)'; },
    dimensionTone(id) { const d = this.dimension(id); if (!d || d.numerator === null) return 'unknown'; if (d.category === 'priority') return 'priority'; if (d.numerator > 0) return 'attention'; return d.denominator ? 'clear' : 'empty'; },
    // Ring for an area: the overdue share, or a full ring when everything reviewed is up to date.
    ringShare(id) { const d = this.dimension(id); if (!d || d.numerator === null || !d.denominator) return 0; return d.numerator ? Math.max(3, Math.round(100 * d.numerator / d.denominator)) : 100; },
    ringMark(id) { const d = this.dimension(id); if (!d || d.numerator === null) return '?'; if (!d.denominator) return '–'; return d.numerator ? Math.round(100 * d.numerator / d.denominator) + '%' : '✓'; },
    preparationTone(item) { return item.ready === true ? 'ready' : item.class === 'necessary' && item.ready === false ? 'pending' : item.class === 'optional' ? 'optional' : 'unknown'; },
    preparationMark(item) { return { ready: '✓', pending: '!', optional: '○', unknown: '?' }[this.preparationTone(item)]; },
    meterWidth(id) { const d = this.dimension(id); return d && d.denominator ? Math.max(d.numerator ? 2 : 0, Math.round(100 * d.numerator / d.denominator)) + '%' : '0%'; },
    openAgenda() { const zone = this.data ? this.data.snapshot.timeZone : 'America/Mexico_City'; const date = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(this.currentTime || Date.now())); this.$router.push({ name: 'Citas', query: { date } }).catch(() => {}); },
    reviewNote(id) { if (String(id).startsWith('pulse-invalid-')) { this.loadInvalid(String(id).slice(14)); return; } this.$nextTick(()=>{const target=document.getElementById(id);if(target){target.scrollIntoView({block:'center',behavior:'auto'});target.focus({preventScroll:true});}}); },
    start() {
      if (this.running) return; this.running = true;
      this.reader.activate(); if (this.st.context !== this.context.key) this.$store.commit('CORE/PULSE/reset', this.context.key);
      this.onVisibility = () => { clearInterval(this.timer); this.timer = null; if (!document.hidden && this.allowed && !this.st.denied) { this.tick++; this.check(); this.timer = setInterval(() => { this.tick++; if (this.tick % 30 === 0) this.check(); },1000); } };
      document.addEventListener('visibilitychange', this.onVisibility); window.addEventListener('focus', this.onFocus = () => { if (!document.hidden) this.check(); });
      if (this.allowed) { this.lastCheck = performance.now(); if (this.st.pendingAppointment) this.verifyReturn(); else { this.busy = true; this.reader.snapshot(!this.st.applied, Boolean(this.st.savedAt)).finally(() => { if (this.running) this.busy = false; }); } this.loadHistory(); }
      this.onVisibility();
      const target = this.st.returnTarget;
      if (target && target.context === this.context.key && !this.st.pendingAppointment) this.$nextTick(() => { const el = document.getElementById(target.focusId); if (el) el.focus({preventScroll:true}); window.scrollTo(0,target.scroll || 0); });
    },
    stop() { this.running = false; this.reader.stop(); clearInterval(this.timer); document.removeEventListener('visibilitychange',this.onVisibility); window.removeEventListener('focus',this.onFocus); this.busy = false; this.verifying = false; this.historyBusy = false; this.listBusy = false; this.list = null; this.invalid = { lists: {}, errors: {}, busy: null }; this.sessionBusy = false; this.freshStamps = []; this.celebration = ''; this.$store.commit('CORE/PULSE/appointmentOutcome',null); },
    restart() { const wasRunning = this.running; this.stop(); this.$store.commit('CORE/PULSE/reset',this.context.key); this.selected = null; this.announcement = ''; if(wasRunning)this.start(); },
    check() { const now = performance.now(); if (this.running && this.allowed && !this.st.denied && !this.st.errors.snapshot && !document.hidden && now - this.lastCheck >= 5000) { this.lastCheck = now; this.reader.snapshot(false,Boolean(this.st.savedAt)); } },
    async update() { if (this.st.pendingAppointment) return this.verifyReturn(); this.busy = true; this.announcement = ''; this.$store.commit('CORE/PULSE/appointmentOutcome',null); try { if (this.st.candidate && !this.expiredCandidate && !this.st.candidate.snapshot.refreshPending) this.$store.commit('CORE/PULSE/applied',this.st.candidate); else await this.reader.snapshot(true,true); if (this.running && !this.st.errors.snapshot && this.data) { this.announcement = refreshSummary(this.data); if (this.selected) this.loadList(); } } finally { if (this.running) this.busy = false; } },
    async loadHistory() { if (!this.allowed || this.st.denied) return; this.historyBusy = true; await this.reader.history(); if (this.running) this.historyBusy = false; },
    async verifyReturn() {
      if (this.verifying || !this.allowed) return;
      const context = this.context.key; this.verifying = true; this.busy = true;
      this.$nextTick(() => { if (this.$refs.outcome) this.$refs.outcome.scrollIntoView({block:'center'}); });
      try { await this.reader.verifyAppointment(); if (this.running && this.context.key === context && this.verifiedResult) this.recognition++; }
      finally { if (this.running && this.context.key === context) { this.verifying = false; this.busy = false; } }
    },
    selectList(id) { this.selectedFocus = 'incident-' + id; this.selected = id; this.list = null; this.listBusy = false; this.$store.commit('CORE/PULSE/error',{block:'list',message:''}); this.loadList(); this.$nextTick(() => { if(this.$refs.incidentList)this.$refs.incidentList.focus(); }); },
    async loadList(cursor) { const id = this.selected; if (!id || this.listBusy) return; const request = ++this.listRequest; this.listBusy = true; const list = await this.reader.incidents(id,cursor); if (this.running && this.selected === id && request === this.listRequest) { this.list = list; this.listBusy = false; } },
    openAction(action) { const target = actionTarget(action); if (!target) { this.announcement = 'El destino ya no está disponible. Actualiza la lectura.'; return; } this.$store.commit('CORE/PULSE/returnTarget',{context:this.context.key,focusId:this.selectedFocus || 'pulse-preparation',scroll:window.scrollY,indicatorId:this.selected,appointmentId:target.name==='Citas'?target.query.recordId:null}); this.$router.push(target); },
    dimension(id) { return this.data && this.data.dimensions.find(d => d.id === id); },
    source(id) { const d = this.dimension(id); return d && this.data.quality.sources.find(s => s.id === d.sourceId); },
    formatTime(value) { if (!value) return 'sin fecha'; const date = new Date(value); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('es-MX',{timeZone:this.data ? this.data.snapshot.timeZone : 'America/Mexico_City',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(date) : 'fecha no disponible'; },
    incidentTitle(item) { const one=item.count===1; return {
      'PUL-OP01': one ? 'Un seguimiento necesita retomarse' : item.count+' seguimientos necesitan retomarse',
      'PUL-OP02': one ? 'Una firma sigue pendiente' : item.count+' firmas siguen pendientes',
      'PUL-OP03': one ? 'Una cita pasada necesita revisarse' : item.count+' citas pasadas necesitan revisarse'
    }[item.indicatorId]; },
    reviewLabel(id, count) { return {'PUL-OP01':count===1?'Revisar seguimiento':'Revisar seguimientos','PUL-OP02':count===1?'Revisar firma':'Revisar firmas','PUL-OP03':count===1?'Revisar cita':'Revisar citas'}[id]; },
    ageText(item) { return (item.count===1 ? 'Lleva ' : 'El pendiente más antiguo lleva ')+item.oldestAgeDays+(item.oldestAgeDays===1?' día.':' días.'); },
    reason(id, count) { const one=count===1; return {
      'PUL-OP01':one?'Pasó la fecha prevista y todavía falta una cita vigente vinculada al seguimiento.':'Pasaron sus fechas previstas y todavía faltan citas vigentes vinculadas a esos seguimientos.',
      'PUL-OP02':one?'La solicitud venció y aún falta la firma necesaria.':'Las solicitudes vencieron y aún faltan las firmas necesarias.',
      'PUL-OP03':one?'Pasaron al menos dos horas desde que terminaba la cita y aún falta registrar cómo quedó.':'Pasaron al menos dos horas desde que terminaban estas citas y aún falta registrar cómo quedaron.'
    }[id]; },
    dimensionStory(id) { const d=this.dimension(id); if(!d) return 'Estamos buscando estos datos.'; if(d.numerator===null) return 'No pudimos comprobar estos registros. Los pendientes anteriores no se dan por resueltos.'; return {
      'PUL-OP01':'Revisamos si los seguimientos cuya fecha prevista ya pasó tienen una cita vigente vinculada.',
      'PUL-OP02':'Miramos las solicitudes de firma necesarias que ya vencieron y siguen sin completarse.',
      'PUL-OP03':'Revisamos las citas pasadas que todavía necesitan un estado final. Las futuras conservan su tiempo.'
    }[id]; },
    friendlyError(block) { return this.st.savedAt && block==='snapshot' ? 'Tu cambio se guardó. Todavía no pudimos comprobarlo en este resumen; vuelve a intentar en unos segundos.' : {snapshot:'No pudimos actualizar el resumen. Conservamos el anterior con su fecha, si lo hay.',list:'No pudimos abrir esta lista. Puedes volver a consultarla.',history:'Por ahora no pudimos consultar los resúmenes anteriores.'}[block]; },
    preparationHelp(item) { if(item.ready===true) return {
      'agenda-hours':'Las agendas revisadas tienen horarios de atención configurados para reservar citas.',
      'prescription-readiness':'Los datos profesionales, la firma y los datos del consultorio necesarios para emitir recetas están configurados.',
      'document-signing-readiness':'Los profesionales que deben firmar tienen configurados los datos y la firma necesarios.',
      'clinic-timezone':'La agenda tiene una zona horaria válida para interpretar las fechas y horas de las citas.'
    }[item.id] || 'La configuración revisada está completa para esta herramienta.'; return {
      'agenda-hours':'Revisa los horarios para poder reservar citas.',
      'prescription-readiness':'Revisa los datos profesionales y la configuración para emitir recetas.',
      'document-signing-readiness':'Revisa la identidad y la configuración para firmar documentos.',
      'clinic-timezone':'Necesitamos una zona horaria válida para interpretar las fechas de tus citas.',
      'functions-not-confirmed':'Faltan datos para saber qué herramientas necesitan preparación.'
    }[item.id] || 'Revisa los pasos necesarios para esta herramienta.'; },
    preparationName(id) { return {'agenda-hours':'Horarios de agenda','prescription-readiness':'Emisión de recetas','document-signing-readiness':'Firma de documentos','clinic-timezone':'Zona horaria','functions-not-confirmed':'Funciones utilizadas'}[id] || 'Requisito de preparación'; },
    limitationText(value) { return {
      'Solo obligaciones registradas; no evalua calidad clinica.':'El Pulso refleja lo registrado en el sistema y no mide la calidad de la atención clínica.',
      'Zona fallback; no acreditada como configuracion del negocio.':'Falta confirmar la zona horaria del consultorio; las fechas usan una zona de referencia.'
    }[value] || value; },
    taskName(task) { return {reservar_horario:'reservar citas',emitir_receta:'emitir recetas',firmar_documento:'firmar documentos'}[task] || 'tarea del consultorio'; }
  }
};
</script>

<style scoped>
/* Pulso del consultorio. Los tonos viven en variables; el tema oscuro solo las redefine. */
.pulse-page {
  --p-ink: #162742;
  --p-text: #2a3850;
  --p-muted: #56657a;
  --p-kicker: #4f6580;
  --p-link: #1f4a72;
  --p-surface: #ffffff;
  --p-surface-2: #f5f8fc;
  --p-border: #dae3ee;
  --p-track: #e4eaf2;
  --p-primary: #203d65;
  --p-primary-ink: #ffffff;
  --p-focus: #1a7789;
  --p-priority: #c9652f;
  --p-priority-ink: #8f4415;
  --p-priority-bg: #fff1e6;
  --p-priority-border: #e9b892;
  --p-attention: #cf9a4f;
  --p-attention-ink: #825410;
  --p-attention-bg: #fff6e6;
  --p-attention-border: #ecd1a2;
  --p-clear: #2f9b78;
  --p-clear-ink: #1b6450;
  --p-clear-bg: #eaf7f1;
  --p-clear-border: #a6d6c2;
  --p-violet: #7a64a8;
  --p-violet-ink: #4e3b78;
  --p-violet-bg: #f4f0fb;
  --p-violet-border: #cfc3e6;
  --p-blue: #4d86b8;
  --p-blue-bg: #eaf2f9;
  --p-danger-ink: #8c3034;
  --p-danger-bg: #fff3f3;
  --p-danger-border: #e0bbbb;
  --p-shadow: 0 1px 2px rgba(22, 39, 66, 0.04), 0 10px 28px rgba(22, 39, 66, 0.06);
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 32px 70px;
  color: var(--p-text);
}

.theme--dark .pulse-page,
html[data-theme="clinical-night"] .pulse-page {
  --p-ink: #e3ebf9;
  --p-text: #d3deeb;
  --p-muted: #b3c3d8;
  --p-kicker: #b3c6dd;
  --p-link: #a9d2ff;
  --p-surface: #17243a;
  --p-surface-2: #1d2b44;
  --p-border: #40506b;
  --p-track: #2b3a52;
  --p-primary: #cfe0f7;
  --p-primary-ink: #14233a;
  --p-focus: #7fd3e2;
  --p-priority: #e08a52;
  --p-priority-ink: #f6cfa9;
  --p-priority-bg: #40301f;
  --p-priority-border: #8a6038;
  --p-attention: #d9a85e;
  --p-attention-ink: #f2dfb8;
  --p-attention-bg: #3a3122;
  --p-attention-border: #866a3d;
  --p-clear: #4fb894;
  --p-clear-ink: #c3efdf;
  --p-clear-bg: #173a35;
  --p-clear-border: #3f7f6b;
  --p-violet: #a591d6;
  --p-violet-ink: #dccff5;
  --p-violet-bg: #272a4a;
  --p-violet-border: #55507e;
  --p-blue: #7fb0d9;
  --p-blue-bg: #1f334a;
  --p-danger-ink: #ffd3d6;
  --p-danger-bg: #452b33;
  --p-danger-border: #7d4a52;
  --p-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 10px 28px rgba(0, 0, 0, 0.25);
}

/* Tipografía y controles base */
h1 { font-size: 38px; line-height: 1.15; letter-spacing: -0.045em; font-weight: 750; color: var(--p-ink); margin: 10px 0 14px; }
h2 { font-size: 24px; font-weight: 700; line-height: 1.3; letter-spacing: -0.02em; color: var(--p-ink); margin: 4px 0 12px; }
h3 { font-size: 18px; font-weight: 700; line-height: 1.4; color: var(--p-ink); margin: 6px 0; }
p { font-size: 14px; line-height: 1.7; margin: 6px 0; }
.pulse-kicker { font-size: 11px; text-transform: uppercase; letter-spacing: 0.13em; font-weight: 750; color: var(--p-kicker); }
.pulse-muted { color: var(--p-muted); font-size: 13px !important; }

.pulse-page a { color: var(--p-link); text-decoration: underline; text-underline-offset: 4px; }
.pulse-page button { font-size: 13px; font-weight: 650; line-height: 1.4; padding: 10px 14px; border: 1px solid var(--p-border); border-radius: 10px; background: var(--p-surface); color: var(--p-link); min-height: 42px; transition: background-color 150ms ease, border-color 150ms ease, transform 150ms ease; }
.pulse-page button:hover:not(:disabled) { border-color: var(--p-link); background: var(--p-surface-2); }
.pulse-page button:disabled { opacity: 0.6; cursor: wait; }
.pulse-page button.pulse-primary { background: var(--p-primary); color: var(--p-primary-ink); border-color: var(--p-primary); box-shadow: 0 6px 16px rgba(32, 61, 101, 0.18); }
.pulse-page button.pulse-primary:hover:not(:disabled) { background: var(--p-primary); transform: translateY(-1px); }
.pulse-page button.pulse-link-button { align-self: flex-start; margin-top: 6px; min-height: 40px; padding: 7px 12px; font-size: 12px; }
.pulse-page button:focus-visible,
.pulse-page a:focus-visible,
.pulse-page summary:focus-visible,
[tabindex="-1"]:focus-visible { outline: 3px solid var(--p-focus); outline-offset: 4px; }

/* Encabezado */
.pulse-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 28px; margin-bottom: 26px; }
.pulse-heading > div { max-width: 790px; }
.pulse-heading > a { font-size: 13px; white-space: nowrap; margin-top: 14px; }
.pulse-intro { font-size: 16px; line-height: 1.8; color: var(--p-muted); max-width: 760px; }

/* Avisos y errores */
.pulse-notice { background: var(--p-attention-bg); border: 1px solid var(--p-attention-border); color: var(--p-attention-ink); padding: 16px; border-radius: 14px; margin: 12px 0; }
.pulse-notice h2 { color: inherit; }
.pulse-error { padding: 12px 14px; color: var(--p-danger-ink); background: var(--p-danger-bg); border: 1px solid var(--p-danger-border); border-radius: 10px; }
.pulse-empty { background: var(--p-clear-bg); border-left: 4px solid var(--p-clear); border-radius: 0 12px 12px 0; padding: 18px 22px; color: var(--p-clear-ink); }
.pulse-announcement:empty { display: none; }
.pulse-announcement { font-size: 13px; color: var(--p-clear-ink); padding: 12px 0 0; margin: 0; }

/* Lectura principal */
.pulse-overview { padding: 26px; border: 1px solid var(--p-border); border-radius: 26px; background: linear-gradient(145deg, var(--p-surface-2), var(--p-surface)); box-shadow: var(--p-shadow); }
.pulse-hero { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr); gap: 22px; align-items: stretch; padding-bottom: 22px; }
.pulse-state-copy { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 18px; padding: 4px 0; }
.pulse-state-copy h2 { font-size: 28px; letter-spacing: -0.03em; margin: 14px 0 8px; }
.pulse-state-copy p { margin: 0; max-width: 640px; font-size: 15px; }
.pulse-state-copy > a { font-size: 13px; font-weight: 650; }
.pulse-story-action { max-width: 100%; white-space: normal; min-height: 46px !important; padding: 11px 18px !important; font-size: 14px !important; }
.pulse-status { display: inline-block; padding: 6px 11px; background: var(--p-blue-bg); color: var(--p-link); border: 1px solid var(--p-border); border-radius: 999px; font-size: 12px; font-weight: 700; }
.status-priority { background: var(--p-priority-bg); border-color: var(--p-priority-border); color: var(--p-priority-ink); }
.status-attention { background: var(--p-violet-bg); border-color: var(--p-violet-border); color: var(--p-violet-ink); }
.status-clear { background: var(--p-clear-bg); border-color: var(--p-clear-border); color: var(--p-clear-ink); }
.status-unknown { background: var(--p-attention-bg); border-color: var(--p-attention-border); color: var(--p-attention-ink); }

.pulse-vitals { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; list-style: none; margin: 0; padding: 0; }
.pulse-vitals li { min-width: 0; }
.pulse-vitals a { display: flex; flex-direction: column; gap: 2px; height: 100%; padding: 14px 16px; border: 1px solid var(--p-border); border-radius: 16px; background: var(--p-surface); color: var(--p-text); text-decoration: none; transition: transform 150ms ease, border-color 150ms ease; }
.pulse-vitals a:hover { transform: translateY(-2px); border-color: var(--p-link); }
.pulse-vitals strong { font-size: 32px; line-height: 1.05; font-weight: 750; letter-spacing: -0.04em; color: var(--p-ink); }
.pulse-vitals span { font-size: 13px; font-weight: 650; line-height: 1.35; }
.pulse-vitals small { font-size: 12px; line-height: 1.4; color: var(--p-muted); }
.vital-priority a { background: var(--p-priority-bg); border-color: var(--p-priority-border); }
.vital-priority strong { color: var(--p-priority-ink); }
.vital-attention a { background: var(--p-attention-bg); border-color: var(--p-attention-border); }
.vital-attention strong { color: var(--p-attention-ink); }
.vital-good a { background: var(--p-clear-bg); border-color: var(--p-clear-border); }
.vital-good strong { color: var(--p-clear-ink); }

.pulse-quiet-sky { border-radius: 20px; background: var(--p-track); min-height: 260px; display: grid; place-items: center; color: var(--p-muted); padding: 24px; text-align: center; }
.pulse-update-bar { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-top: 20px; border-top: 1px solid var(--p-border); padding-top: 16px; }
.pulse-update-bar p { font-size: 12px; }
.pulse-controls { display: flex; flex-wrap: wrap; gap: 10px; flex-shrink: 0; align-items: center; }
.pulse-controls a { font-size: 13px; }
.pulse-overview > .pulse-error { margin-top: 14px; }

.pulse-outcome { display: flex; align-items: center; gap: 14px; background: var(--p-blue-bg); border: 1px solid var(--p-border); border-radius: 14px; padding: 15px 18px; margin: 0 0 18px; color: var(--p-text); }
.pulse-outcome > span { font-size: 23px; }
.pulse-outcome > div { flex: 1; }
.pulse-outcome strong { font-size: 15px; }
.pulse-outcome p { font-size: 13px; margin: 4px 0 0; }
.outcome-verified { background: var(--p-clear-bg); border-color: var(--p-clear-border); color: var(--p-clear-ink); }

/* Navegación entre secciones */
.pulse-nav { display: flex; gap: 8px; margin: 18px 0 4px; padding-bottom: 4px; overflow-x: auto; scrollbar-width: thin; }
.pulse-nav a { display: inline-flex; align-items: center; gap: 8px; flex: 0 0 auto; min-height: 40px; padding: 6px 14px; border: 1px solid var(--p-border); border-radius: 999px; background: var(--p-surface); color: var(--p-text); font-size: 13px; font-weight: 650; text-decoration: none; }
.pulse-nav a:hover { border-color: var(--p-link); color: var(--p-link); }
.pulse-nav a > span { font-size: 11px; color: var(--p-kicker); }
.pulse-nav b { min-width: 22px; padding: 1px 7px; border-radius: 999px; background: var(--p-attention-bg); color: var(--p-attention-ink); font-size: 12px; text-align: center; }

/* Tu jugada de hoy */
.pulse-play { margin: 18px 0 0; padding: 24px; border: 1px solid var(--p-violet-border); border-radius: 24px; background: linear-gradient(150deg, var(--p-violet-bg), var(--p-surface-2) 60%, var(--p-clear-bg)); scroll-margin-top: 80px; }
.pulse-play-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.pulse-play-heading h2 { margin: 4px 0 0; }
.pulse-play-chip { flex-shrink: 0; font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 999px; background: var(--p-attention-bg); color: var(--p-attention-ink); border: 1px solid var(--p-attention-border); }
.pulse-celebrate { margin: 14px 0 0; padding: 10px 14px; border-radius: 12px; background: var(--p-clear-bg); color: var(--p-clear-ink); font-weight: 650; border: 1px solid var(--p-clear-border); }
.pulse-play-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-top: 18px; }
.pulse-play-card { position: relative; padding: 18px; border: 1px solid var(--p-border); border-radius: 18px; background: var(--p-surface); display: flex; flex-direction: column; gap: 6px; overflow: hidden; }
.pulse-play-card::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--card-accent, var(--p-border)); }
.pulse-play-card h3 { margin: 2px 0 4px; }
.pulse-play-card p { margin: 0; }
.pulse-play-card > button { align-self: flex-start; margin-top: 8px; }
.play-session { grid-column: 1 / -1; --card-accent: var(--p-violet); border-color: var(--p-violet-border); }
.play-rescue { --card-accent: var(--p-attention); }
.play-tomorrow { --card-accent: var(--p-blue); }
.play-tomorrow.is-ready,
.play-stamps { --card-accent: var(--p-clear); }
.play-yesterday { --card-accent: var(--p-violet); grid-column: 1 / -1; }
.play-tomorrow .pulse-meter span { background: var(--p-blue); }
.play-tomorrow.is-ready .pulse-meter span { background: var(--p-clear); }

.session-intro { display: flex; align-items: center; gap: 18px; }
.session-number { flex: 0 0 auto; display: grid; place-items: center; width: 72px; height: 72px; border-radius: 22px; background: var(--p-violet-bg); border: 1px solid var(--p-violet-border); color: var(--p-violet-ink); font-size: 34px; font-weight: 750; letter-spacing: -0.04em; }
.session-dots { display: flex; gap: 8px; list-style: none; padding: 0; margin: 6px 0 4px; }
.session-dots li { flex: 1 1 0; max-width: 56px; height: 8px; border-radius: 999px; background: var(--p-track); }
.session-dots .dot-current { background: var(--p-violet); }
.session-dots .dot-skipped { background: var(--p-violet-border); }
.session-dots .dot-done { background: var(--p-clear); }
.session-current { display: flex; flex-direction: column; gap: 4px; padding: 16px 18px; margin: 6px 0; border-radius: 14px; background: var(--p-violet-bg); }
.session-current strong { font-size: 19px; color: var(--p-ink); }
.session-area { font-size: 12px; color: var(--p-muted); font-weight: 650; }
.session-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; align-items: center; }
.session-actions .pulse-link-button { margin-top: 0 !important; min-height: 42px !important; }
.session-badge,
.pulse-badge-rescue { align-self: flex-start; display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.02em; padding: 3px 9px; border-radius: 999px; background: var(--p-track); color: var(--p-text); }
.badge-priority { background: var(--p-priority-bg); color: var(--p-priority-ink); }
.badge-rescue,
.pulse-badge-rescue { background: var(--p-attention-bg); color: var(--p-attention-ink); }
.pulse-badge-rescue { margin-left: 8px; }
.session-done { padding: 14px 16px; margin: 6px 0; border-radius: 12px; background: var(--p-clear-bg); color: var(--p-clear-ink); }
.session-done h3 { color: var(--p-clear-ink); }

.rescue-list,
.stamp-list,
.check-list,
.yesterday-list,
.pulse-area-streaks { list-style: none; padding: 0; margin: 8px 0 0; }
.rescue-list li { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; border-top: 1px solid var(--p-border); }
.rescue-list strong { font-size: 20px; color: var(--p-attention-ink); margin-right: 4px; }
.rescue-list .pulse-link-button { margin-top: 0 !important; }
.stamp-list li { display: flex; align-items: center; gap: 12px; padding: 7px 0; }
.stamp-mark { width: 38px; height: 38px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center; font-weight: 750; font-size: 14px; border: 2px dashed var(--p-border); color: var(--p-muted); }
.stamp-list strong { display: block; font-size: 14px; color: var(--p-ink); }
.stamp-list span { font-size: 12px; color: var(--p-muted); }
.stamp-clear .stamp-mark { border: 2px solid var(--p-clear); background: var(--p-clear-bg); color: var(--p-clear-ink); }
.stamp-earned .stamp-mark { background: var(--p-clear); color: #ffffff; }
.stamp-open .stamp-mark { border: 2px solid var(--p-attention); color: var(--p-attention-ink); }
.check-list li { display: flex; gap: 10px; align-items: flex-start; padding: 5px 0; font-size: 14px; }
.check-list li span { width: 18px; flex-shrink: 0; color: var(--p-blue); font-weight: 700; }
.check-list .is-done { color: var(--p-clear-ink); }
.check-list .is-done span { color: var(--p-clear); }
.yesterday-list { display: flex; flex-wrap: wrap; gap: 10px; }
.yesterday-list li { display: flex; flex-direction: column; padding: 8px 12px; border-radius: 12px; background: var(--p-violet-bg); min-width: 88px; }
.yesterday-list strong { font-size: 24px; color: var(--p-violet-ink); }
.yesterday-list span { font-size: 12px; color: var(--p-muted); }

/* Secciones */
.pulse-section { margin-top: 18px; padding: 28px; border: 1px solid var(--p-border); border-radius: 24px; background: var(--p-surface); box-shadow: var(--p-shadow); scroll-margin-top: 80px; }
.pulse-section-heading { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.pulse-section-heading h2 { margin-bottom: 0; scroll-margin-top: 90px; }
.pulse-section-heading > div { flex: 1 1 0; min-width: 0; }
.pulse-number { font-size: 12px; font-weight: 750; border-radius: 12px; width: 38px; height: 38px; display: grid; place-items: center; flex-shrink: 0; margin-top: 4px; background: var(--p-blue-bg); color: var(--p-link); }
.pulse-count { margin-left: auto; margin-top: 12px; padding: 5px 12px; border-radius: 999px; background: var(--p-attention-bg); color: var(--p-attention-ink); font-size: 12px; font-weight: 700; white-space: nowrap; }

/* 01 · Pendientes */
.pulse-priority { display: flex; align-items: center; gap: 18px; padding: 20px 22px; border: 1px solid var(--p-border); border-left: 5px solid var(--p-violet); border-radius: 18px; margin: 12px 0; background: var(--p-surface-2); scroll-margin-top: 90px; }
.pulse-priority.is-priority { border-left-color: var(--p-priority); }
.pulse-cause-count { flex-shrink: 0; display: grid; place-items: center; align-content: center; width: 68px; height: 68px; border-radius: 20px; background: var(--p-violet-bg); color: var(--p-violet-ink); }
.pulse-cause-count strong { font-size: 26px; line-height: 1; font-weight: 750; letter-spacing: -0.03em; }
.pulse-cause-count span { font-size: 12px; line-height: 1.3; }
.is-priority .pulse-cause-count { background: var(--p-priority-bg); color: var(--p-priority-ink); }
.pulse-cause-copy { flex: 1; min-width: 0; }
.pulse-priority h3 { font-size: 19px; margin: 8px 0 6px; }
.pulse-priority p { max-width: 680px; }
.pulse-priority > button { flex-shrink: 0; min-height: 44px; }
.pulse-priority > .pulse-muted { max-width: 220px; }
.pulse-splitbar { display: flex; gap: 2px; height: 8px; max-width: 420px; margin: 10px 0 2px; border-radius: 999px; overflow: hidden; }
.pulse-splitbar .bar-priority { background: var(--p-priority); min-width: 6px; }
.pulse-splitbar .bar-recent { flex: 1; background: var(--p-violet-border); min-width: 6px; }
.pulse-split { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 0; }
.pulse-split span { font-size: 12px; font-weight: 650; line-height: 1.4; padding: 3px 9px; border-radius: 999px; background: var(--p-track); color: var(--p-text); }
.pulse-split .split-priority { background: var(--p-priority-bg); color: var(--p-priority-ink); }
.pulse-split .split-rescue { background: var(--p-attention-bg); color: var(--p-attention-ink); }

.pulse-incidents { margin-top: 22px; border: 1px solid var(--p-border); border-radius: 18px; padding: 22px; background: var(--p-surface-2); scroll-margin-top: 90px; }
.pulse-incidents-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.pulse-incidents ol { list-style: none; padding: 0; margin: 12px 0; display: grid; gap: 8px; }
.pulse-incidents li { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 14px 16px; border: 1px solid var(--p-border); border-left: 4px solid var(--p-violet-border); border-radius: 14px; background: var(--p-surface); }
.pulse-incidents li.row-priority { border-left-color: var(--p-priority); }
.pulse-incidents li strong { color: var(--p-ink); }
.pulse-incidents li p { margin: 3px 0 0; font-size: 13px; }
.pulse-incidents li button { flex-shrink: 0; }

/* 02 · Áreas */
.pulse-areas { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px; margin-top: 14px; }
.pulse-area { --area: var(--p-muted); display: flex; flex-direction: column; gap: 10px; padding: 20px; border: 1px solid var(--p-border); border-radius: 18px; background: var(--p-surface-2); }
.pulse-area > p { margin: 0; font-size: 13px; }
.pulse-area-top { display: flex; align-items: center; gap: 16px; }
.pulse-area-title { min-width: 0; }
.pulse-area-title h3 { margin: 0 0 2px; font-size: 16px; }
.pulse-area-title strong { display: block; font-size: 24px; line-height: 1.2; font-weight: 750; letter-spacing: -0.03em; color: var(--p-ink); }
.pulse-area-title span { display: block; font-size: 13px; line-height: 1.4; color: var(--p-muted); }
.pulse-ring { position: relative; flex: 0 0 auto; width: 76px; height: 76px; }
.pulse-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.pulse-ring circle { fill: none; stroke-width: 3.6; }
.pulse-ring .ring-track { stroke: var(--p-track); }
.pulse-ring .ring-value { stroke: var(--area); stroke-linecap: round; transition: stroke-dasharray 600ms ease; }
.pulse-ring > span { position: absolute; inset: 0; display: grid; place-items: center; font-size: 15px; font-weight: 750; color: var(--p-ink); }
.pulse-area-notes { display: flex; flex-direction: column; gap: 4px; margin-top: auto; }
.pulse-area-notes small { font-size: 12px; line-height: 1.5; color: var(--p-muted); }
.dim-priority { --area: var(--p-priority); border-color: var(--p-priority-border); }
.dim-priority .pulse-area-title strong { color: var(--p-priority-ink); }
.dim-attention { --area: var(--p-attention); }
.dim-attention .pulse-area-title strong { color: var(--p-attention-ink); }
.dim-clear { --area: var(--p-clear); }
.dim-clear .pulse-area-title strong { color: var(--p-clear-ink); }

.pulse-invalid { margin: 14px 0 0; padding: 16px 18px; border: 1px solid var(--p-attention-border); border-radius: 14px; background: var(--p-attention-bg); scroll-margin-top: 90px; }
.pulse-invalid-title { display: block; color: var(--p-ink); }
.pulse-invalid ul { list-style: none; margin: 8px 0 0; padding: 0; }
.pulse-invalid li { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 0; border-top: 1px solid var(--p-attention-border); }
.pulse-invalid li p { margin: 3px 0 0; font-size: 13px; }
.pulse-invalid li button { flex-shrink: 0; min-height: 40px; padding: 7px 12px; font-size: 12px; }

/* 03 · Configuración */
.pulse-meter { height: 8px; border-radius: 999px; background: var(--p-track); overflow: hidden; margin: 6px 0 2px; }
.pulse-meter span { display: block; height: 100%; border-radius: 999px; background: var(--p-attention); transition: width 500ms ease; }
.pulse-mission { display: flex; align-items: center; gap: 18px; padding: 16px 18px; margin: 12px 0; border: 1px solid var(--p-border); border-radius: 16px; background: var(--p-blue-bg); }
.pulse-mission > div:first-child { flex: 1; }
.pulse-mission strong { display: block; font-size: 15px; margin-top: 4px; color: var(--p-ink); }
.pulse-mission .pulse-meter { flex: 0 0 220px; height: 10px; margin: 0; }
.pulse-mission .pulse-meter span { background: var(--p-blue); }
.mission-done { background: var(--p-clear-bg); border-color: var(--p-clear-border); }
.mission-done strong { color: var(--p-clear-ink); }
.mission-done .pulse-meter span { background: var(--p-clear); }
.pulse-preparation-list { display: grid; gap: 10px; margin-top: 12px; }
.pulse-preparation { display: flex; align-items: flex-start; gap: 14px; padding: 16px 18px; border: 1px solid var(--p-border); border-radius: 16px; background: var(--p-surface-2); }
.pulse-preparation > div { flex: 1; min-width: 0; }
.pulse-preparation strong { font-size: 16px; color: var(--p-ink); }
.pulse-preparation span:not(.prep-mark) { display: block; margin-top: 3px; font-size: 13px; font-weight: 650; color: var(--p-muted); }
.pulse-preparation > button { flex-shrink: 0; }
.prep-mark { flex: 0 0 auto; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: var(--p-track); color: var(--p-muted); font-weight: 750; }
.prep-ready .prep-mark { background: var(--p-clear-bg); color: var(--p-clear-ink); box-shadow: inset 0 0 0 2px var(--p-clear); }
.prep-ready span:not(.prep-mark) { color: var(--p-clear-ink); }
.prep-pending { border-color: var(--p-attention-border); }
.prep-pending .prep-mark { background: var(--p-attention-bg); color: var(--p-attention-ink); box-shadow: inset 0 0 0 2px var(--p-attention); }
.prep-pending span:not(.prep-mark) { color: var(--p-attention-ink); }

/* 04 · Progreso */
.pulse-progress { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin: 18px 0; }
.pulse-stat { padding: 18px 20px; border: 1px solid var(--p-border); border-radius: 16px; background: var(--p-surface-2); }
.pulse-stat strong { display: block; font-size: 30px; line-height: 1.15; font-weight: 750; letter-spacing: -0.03em; margin: 6px 0; color: var(--p-ink); }
.pulse-stat p { margin: 0; font-size: 13px; line-height: 1.6; }
.pulse-stat small { display: block; margin-top: 6px; font-size: 12px; color: var(--p-muted); }
.stat-good { background: var(--p-clear-bg); border-color: var(--p-clear-border); }
.stat-good strong { color: var(--p-clear-ink); }
.stat-warn { background: var(--p-attention-bg); border-color: var(--p-attention-border); }
.stat-warn strong { color: var(--p-attention-ink); }
.pulse-area-streaks { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 0 0 16px; }
.pulse-area-streaks li { padding: 12px 14px; border: 1px solid var(--p-border); border-radius: 14px; background: var(--p-surface); }
.pulse-area-streaks strong { display: block; font-size: 14px; color: var(--p-ink); }
.pulse-area-streaks span { display: block; font-size: 13px; margin-top: 2px; }
.pulse-area-streaks small { display: block; font-size: 12px; color: var(--p-muted); margin-top: 4px; }
.pulse-area-streaks .has-streak { border-color: var(--p-clear-border); background: var(--p-clear-bg); }
.pulse-area-streaks .has-streak span { color: var(--p-clear-ink); font-weight: 650; }

.pulse-trends { margin: 8px 0 14px; padding: 16px 18px; border: 1px solid var(--p-border); border-radius: 16px; background: var(--p-surface-2); }
.pulse-trend { display: grid; grid-template-columns: 120px minmax(0, 1fr) 100px; align-items: end; gap: 14px; padding: 8px 0; }
.pulse-trend + .pulse-trend { border-top: 1px dashed var(--p-border); }
.pulse-trend-name { font-size: 13px; font-weight: 650; align-self: center; color: var(--p-ink); }
.pulse-trend-last { font-size: 12px; color: var(--p-muted); align-self: center; }
.pulse-trend-chart { width: 100%; height: 56px; display: block; }
.trend-bar { fill: var(--p-attention); }
.trend-priority { fill: var(--p-priority); }
.trend-clear { fill: var(--p-clear); }
.trend-partial { opacity: 0.5; }
.trend-live { stroke: var(--p-ink); stroke-width: 2; vector-effect: non-scaling-stroke; }
.trend-gap { fill: var(--p-muted); opacity: 0.6; }

.pulse-history-details { margin: 6px 0 10px; }
.pulse-history-details summary { cursor: pointer; font-size: 13px; font-weight: 650; color: var(--p-link); min-height: 32px; }
.pulse-history { padding: 12px 0; border-top: 1px solid var(--p-border); }
.pulse-history span,
.pulse-history small { display: block; margin-top: 4px; font-size: 13px; color: var(--p-muted); }
.pulse-activity { margin: 16px 0; }
.pulse-activity ul { display: flex; flex-wrap: wrap; gap: 10px; list-style: none; padding: 0; margin: 8px 0; }
.pulse-activity li { display: flex; align-items: baseline; gap: 8px; padding: 10px 14px; border: 1px solid var(--p-border); border-radius: 12px; background: var(--p-surface-2); }
.pulse-activity li strong { font-size: 22px; color: var(--p-ink); }
.pulse-activity li span { font-size: 12px; color: var(--p-muted); }
.pulse-analysis-link { display: inline-block; margin-top: 8px; font-size: 14px; font-weight: 650; }

@media (prefers-reduced-motion: no-preference) {
  .stamp-pop .stamp-mark { animation: pulse-stamp 0.7s cubic-bezier(0.2, 1.4, 0.4, 1) 1; }
  .pulse-celebrate,
  .session-done { animation: pulse-rise 0.5s ease-out 1; }
  @keyframes pulse-stamp { 0% { transform: scale(0.4) rotate(-25deg); opacity: 0.2; } 70% { transform: scale(1.15) rotate(4deg); opacity: 1; } 100% { transform: scale(1) rotate(0); } }
  @keyframes pulse-rise { from { transform: translateY(6px); opacity: 0; } to { transform: none; opacity: 1; } }
}

@media (prefers-reduced-motion: reduce) {
  .pulse-page button,
  .pulse-vitals a,
  .pulse-ring .ring-value,
  .pulse-meter span { transition: none; }
  .pulse-page button.pulse-primary:hover:not(:disabled),
  .pulse-vitals a:hover { transform: none; }
}

@media (max-width: 1000px) {
  .pulse-hero { grid-template-columns: 1fr; }
  .pulse-vitals { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .pulse-priority { flex-wrap: wrap; }
  .pulse-priority > button,
  .pulse-priority > .pulse-muted { margin-left: 86px; }
  h1 { font-size: 34px; }
}

@media (max-width: 720px) {
  .pulse-vitals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 600px) {
  .pulse-page { padding: 20px 14px 50px; }
  h1 { font-size: 30px; }
  h2 { font-size: 22px; }
  .pulse-intro { font-size: 15px; line-height: 1.75; }
  .pulse-heading { gap: 12px; flex-wrap: wrap; margin-bottom: 22px; }
  .pulse-heading > a { margin-top: 0; }
  .pulse-overview { padding: 16px; border-radius: 20px; }
  .pulse-state-copy h2 { font-size: 24px; }
  .pulse-story-action { width: 100%; }
  .pulse-vitals a { padding: 12px; }
  .pulse-vitals strong { font-size: 27px; }
  .pulse-update-bar { flex-direction: column; align-items: flex-start; gap: 12px; }
  .pulse-controls { flex-shrink: 1; }
  .pulse-controls button { max-width: 100%; }
  .pulse-outcome { align-items: flex-start; flex-wrap: wrap; padding: 13px; }
  .pulse-outcome > div { min-width: calc(100% - 42px); }
  .pulse-outcome button { margin-left: 36px; }
  .pulse-play { padding: 16px; border-radius: 20px; }
  .pulse-play-heading { flex-direction: column; gap: 8px; }
  .pulse-play-grid { grid-template-columns: 1fr; }
  .session-intro { align-items: flex-start; gap: 12px; }
  .session-number { width: 52px; height: 52px; border-radius: 16px; font-size: 26px; }
  .session-actions button { flex: 1 1 auto; }
  .pulse-section { padding: 18px 16px; border-radius: 20px; }
  .pulse-section-heading { gap: 12px; flex-wrap: wrap; }
  .pulse-count { flex-basis: 100%; margin: 0; text-align: center; white-space: normal; }
  .pulse-priority { padding: 16px; gap: 12px; align-items: flex-start; }
  .pulse-cause-count { width: 48px; height: 48px; border-radius: 14px; }
  .pulse-cause-count strong { font-size: 19px; }
  .pulse-cause-count span { display: none; }
  .pulse-cause-copy { min-width: calc(100% - 60px); }
  .pulse-priority h3 { font-size: 18px; }
  .pulse-priority > button,
  .pulse-priority > .pulse-muted { margin-left: 0; width: 100%; max-width: none; white-space: normal; }
  .pulse-incidents { padding: 15px; }
  .pulse-incidents-heading { flex-wrap: wrap; }
  .pulse-incidents li,
  .pulse-preparation { flex-wrap: wrap; gap: 10px; }
  .pulse-incidents li button,
  .pulse-preparation > button { width: 100%; }
  .pulse-preparation > div { min-width: calc(100% - 50px); }
  .pulse-badge-rescue { margin: 4px 0 0; }
  .pulse-mission { flex-direction: column; align-items: stretch; }
  .pulse-mission .pulse-meter { flex-basis: auto; }
  .pulse-trend { grid-template-columns: 1fr; gap: 4px; }
  .pulse-invalid li { flex-direction: column; align-items: flex-start; }
}
</style>
