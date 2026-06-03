import { describe, it, expect } from 'vitest';
import { sendMessageSchema } from '../validators/message-validators.js';

describe('sendMessageSchema', () => {
  it('should accept valid input', () => {
    const result = sendMessageSchema.safeParse({
      orderId: 1,
      content: '你好',
    });
    expect(result.success).toBe(true);
  });

  it('should accept input with explicit contentType', () => {
    const result = sendMessageSchema.safeParse({
      orderId: 1,
      contentType: 'image',
      content: '图片描述',
    });
    expect(result.success).toBe(true);
  });

  it('should default contentType to text', () => {
    const result = sendMessageSchema.safeParse({
      orderId: 1,
      content: '你好',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contentType).toBe('text');
    }
  });

  it('should reject missing orderId', () => {
    const result = sendMessageSchema.safeParse({ content: '你好' });
    expect(result.success).toBe(false);
  });

  it('should reject orderId of 0', () => {
    const result = sendMessageSchema.safeParse({ orderId: 0, content: '你好' });
    expect(result.success).toBe(false);
  });

  it('should reject negative orderId', () => {
    const result = sendMessageSchema.safeParse({ orderId: -1, content: '你好' });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer orderId', () => {
    const result = sendMessageSchema.safeParse({ orderId: 1.5, content: '你好' });
    expect(result.success).toBe(false);
  });

  it('should reject empty content', () => {
    const result = sendMessageSchema.safeParse({ orderId: 1, content: '' });
    expect(result.success).toBe(false);
  });

  it('should reject content longer than 2000 chars', () => {
    const result = sendMessageSchema.safeParse({ orderId: 1, content: 'A'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('should accept content exactly 2000 chars', () => {
    const result = sendMessageSchema.safeParse({ orderId: 1, content: 'A'.repeat(2000) });
    expect(result.success).toBe(true);
  });

  it('should reject invalid contentType', () => {
    const result = sendMessageSchema.safeParse({
      orderId: 1,
      contentType: 'video',
      content: 'test',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing content', () => {
    const result = sendMessageSchema.safeParse({ orderId: 1 });
    expect(result.success).toBe(false);
  });
});
