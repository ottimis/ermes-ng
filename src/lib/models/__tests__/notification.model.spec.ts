import { describe, expect, it } from 'vitest';
import { isNotifyDataEvent, isNotifyNotification } from '../notification.model';

const base = {
  notification_uuid: 'a1',
  topic: 'issue.opened',
  title: 't',
  body: null,
  severity: 'error',
  entity_type: null,
  entity_id: null,
  payload: null,
  read_at: null,
  created_at: '2026-09-16T10:00:00Z',
};

describe('isNotifyNotification', () => {
  it('accepts a well-formed inbox item', () => {
    expect(isNotifyNotification(base)).toBe(true);
  });
  it('rejects items without a uuid: they cannot be deduplicated', () => {
    expect(isNotifyNotification({ ...base, notification_uuid: '' })).toBe(false);
    expect(isNotifyNotification({ ...base, notification_uuid: undefined })).toBe(false);
  });
  it('rejects unknown severities and non-objects', () => {
    expect(isNotifyNotification({ ...base, severity: 'fatal' })).toBe(false);
    expect(isNotifyNotification(null)).toBe(false);
    expect(isNotifyNotification('x')).toBe(false);
  });
});

describe('isNotifyDataEvent', () => {
  it('is true only with live: true', () => {
    expect(isNotifyDataEvent({ ...base, live: true })).toBe(true);
    expect(isNotifyDataEvent(base)).toBe(false);
    expect(isNotifyDataEvent({ ...base, live: 'yes' })).toBe(false);
  });
});
