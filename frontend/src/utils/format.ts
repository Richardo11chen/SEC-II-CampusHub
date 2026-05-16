import type { DemandStatus, OrderStatus } from '@/types';

/** 学号脱敏：显示前4后3 */
export function maskStudentId(id: string): string {
  if (id.length < 7) return id;
  return id.slice(0, 4) + '****' + id.slice(-3);
}

/** 手机号脱敏：显示前3后4 */
export function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

/** ISO 日期 → 显示格式 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO 日期 → 相对时间 */
export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return formatDateTime(iso);
}

/** 报酬显示 */
export function formatReward(reward: number): string {
  if (reward === 0) return '无偿';
  return `¥${reward.toFixed(reward % 1 === 0 ? 0 : 2)}`;
}

/** 需求状态 → MUI color */
export function demandStatusColor(status: DemandStatus): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  const map: Record<DemandStatus, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
    '开放': 'primary',
    '进行中': 'warning',
    '已完成': 'success',
    '已关闭': 'default',
  };
  return map[status];
}

/** 订单状态 → MUI color */
export function orderStatusColor(status: OrderStatus): 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error' {
  const map: Record<OrderStatus, 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'> = {
    '进行中': 'warning',
    '待确认': 'info',
    '已完成': 'success',
    '已取消': 'default',
    '纠纷中': 'error',
  };
  return map[status];
}
