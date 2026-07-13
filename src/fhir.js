// Converts the confirmed care plan into a FHIR R4 Bundle.
// FHIR is the HL7 standard health systems use to exchange data.
// Medications -> MedicationRequest, appointments/tasks -> Task/Appointment, warnings -> Flag.

function medicationRequest(item) {
  return {
    resource: {
      resourceType: 'MedicationRequest',
      status: item.payload?.is_stopped ? 'stopped' : 'active',
      intent: 'plan',
      medicationCodeableConcept: { text: item.payload?.name || 'Unknown medication' },
      dosageInstruction: [{ text: item.payload?.schedule || item.payload?.plain_language || '' }],
      note: [{ text: item.payload?.plain_language || '' }],
    },
  }
}

function appointmentResource(item) {
  return {
    resource: {
      resourceType: 'Appointment',
      status: 'proposed',
      description: `${item.payload?.with || item.payload?.title || 'Appointment'} — ${item.payload?.when_text || ''}`.trim(),
    },
  }
}

function taskResource(item) {
  return {
    resource: {
      resourceType: 'Task',
      status: 'requested',
      intent: 'plan',
      description: `${item.payload?.title || ''} — ${item.payload?.when_text || ''}`.trim(),
      note: [{ text: item.payload?.plain_language || '' }],
    },
  }
}

function flagResource(item) {
  return {
    resource: {
      resourceType: 'Flag',
      status: 'active',
      category: [{ text: 'clinical warning sign' }],
      code: { text: item.payload?.watch_for || item.payload?.plain_language || 'Warning' },
    },
  }
}

export function toFhirBundle(plan) {
  const entry = plan.map((item) => {
    if (item.category === 'medication') return medicationRequest(item)
    if (item.category === 'appointment') return appointmentResource(item)
    if (item.category === 'task') return taskResource(item)
    if (item.category === 'warning') return flagResource(item)
    return null
  }).filter(Boolean)

  return {
    resourceType: 'Bundle',
    type: 'collection',
    meta: { profile: ['http://hl7.org/fhir/StructureDefinition/Bundle'] },
    timestamp: new Date().toISOString(),
    entry,
  }
}

export function downloadFhir(plan) {
  const bundle = toFhirBundle(plan)
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'care-plan-fhir.json'
  a.click()
  URL.revokeObjectURL(url)
}