# Person lifecycle and appointment history rollout

## Data model
- The existing patients.id remains the stable person identifier to avoid rebuilding foreign-key relationships.
- patients.lifecycle_stage distinguishes lead from patient.
- Lead profiles use a negative temporary daily number internally; it is never exposed as a medical file number.
- patient_records is created only when a person is admitted. Existing patients are backfilled.
- Appointments continue to reference the stable patient/person row, preserving visit, media, surgery and nurse relationships.
- person_events and appointment_events preserve profile and appointment changes.

## Appointment history
- Existing appointment rows are preserved and receive a legacy_imported event.
- New appointments and changes are captured by database triggers.
- Rescheduling updates the existing appointment row and records old/new date and time in appointment_events. This avoids rebuilding the current appointments table, which has a permanent unique slot constraint and is referenced by photography and follow-up tables.
- Cancelled rows are not deleted. The current unique slot constraint means a cancelled slot may remain blocked. Releasing cancelled slots safely requires a separately reviewed appointment-table and dependent-table migration; it is not part of this rollout.

## Deployment order
1. Back up D1 and verify the backup can be restored.
2. Confirm migrations 0001-0009 are applied on the target database.
3. Apply migration 0010 in a non-production D1 database first.
4. Deploy application code only after migration 0010 succeeds.
5. Verify lead creation, duplicate-phone confirmation, appointment booking, rescheduling, cancellation, no-show, profile edits, conversion, and old patient/visit/media screens.
6. Production rollout requires explicit approval. This PR does not deploy code or run a remote migration.

## Rollback
- Do not drop new tables or columns as a rollback step; they contain audit history.
- Roll back application code to the previous deployment if needed. The additive schema can remain unused safely.
- Never run destructive historical migrations 0002 or 0004 against production.
