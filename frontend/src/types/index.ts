/* ===== 通用 ===== */

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  errors?: FieldError[];
  timestamp?: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/* ===== 用户 ===== */

export interface UserProfile {
  id: number;
  studentId: string;
  nickname: string;
  name?: string;
  college?: string;
  phone?: string;
  email?: string;
  avatar?: string;
  creditScore: number;
  role: 'student' | 'admin';
  status: string;
  showRealName: boolean;
  createdAt: string;
}

export interface PublicUserProfile {
  id: number;
  nickname: string;
  name: string | null;
  college?: string;
  avatar?: string;
  creditScore: number;
  totalOrders: number;
  joinedAt: string;
}

export interface LoginResult {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface RefreshResult {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterInput {
  studentId: string;
  password: string;
  nickname: string;
  name?: string;
  email?: string;
  avatar?: string;
}

export interface LoginInput {
  studentId: string;
  password: string;
}

export interface UpdateUserInput {
  nickname?: string;
  avatar?: string;
  college?: string;
  phone?: string;
  showRealName?: boolean;
  name?: string;
  email?: string;
}

/* ===== 需求 ===== */

export type DemandCategory =
  | '快递代取' | '学习辅导' | '二手交易' | '活动组队'
  | '失物招领' | '拼车拼单' | '找搭子' | '咨询答疑' | '其他';

export type DemandStatus = '开放' | '进行中' | '已完成' | '已关闭';

export interface DemandImage {
  id: number;
  url: string;
  sortOrder: number;
}

export interface Demand {
  id: number;
  title: string;
  description: string;
  category: DemandCategory;
  location?: string;
  expectedTime?: string;
  reward: number;
  status: DemandStatus;
  isUrgent: boolean;
  isAnonymous: boolean;
  images: DemandImage[];
  publisher: {
    id: number;
    nickname: string;
    avatar?: string | null;
    creditScore: number;
  };
  currentOrder?: {
    id: number;
    provider: {
      id: number;
      nickname: string;
      avatar?: string | null;
      creditScore: number;
    };
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DemandSummary {
  id: number;
  title: string;
  category: DemandCategory;
  location?: string;
  reward: number;
  status: DemandStatus;
  isUrgent: boolean;
  isAnonymous: boolean;
  publisher: {
    id: number;
    nickname: string;
    avatar?: string;
    creditScore: number;
  };
  createdAt: string;
}

export interface DemandImageInput {
  url: string;
  sortOrder: number;
}

export interface CreateDemandInput {
  title: string;
  description: string;
  category: DemandCategory;
  location?: string;
  expectedTime?: string;
  reward?: number;
  isUrgent?: boolean;
  isAnonymous?: boolean;
  images?: string[] | DemandImageInput[];
}

export interface DemandQueryParams {
  category?: DemandCategory;
  status?: DemandStatus;
  keyword?: string;
  sortBy?: 'newest' | 'oldest' | 'reward_high' | 'reward_low';
  isUrgent?: boolean;
  publisherId?: number;
  page?: number;
  pageSize?: number;
}

/* ===== 订单 ===== */

export type OrderStatus = '进行中' | '待确认' | '已完成' | '已取消' | '纠纷中';

export interface Order {
  id: number;
  demandId: number;
  demandTitle: string;
  publisherId: number;
  providerId: number;
  status: OrderStatus;
  reward: number;
  isPaid: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface OrderDetail extends Order {
  publisher: PublicUserProfile;
  provider: PublicUserProfile;
  demand: DemandSummary;
}

export interface CreateOrderInput {
  demandId: number;
  message?: string;
}

export interface OrderQueryParams {
  role?: 'publisher' | 'provider';
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
}

/* ===== 评价 ===== */

export interface Review {
  id: number;
  orderId: number;
  fromUser: PublicUserProfile;
  toUserId: number;
  rating: number;
  content?: string;
  createdAt: string;
}

export interface CreateReviewInput {
  orderId: number;
  rating: number;
  content?: string;
}

/* ===== 聊天消息 ===== */

export type MessageContentType = 'text' | 'image';

export interface ChatMessage {
  id: number;
  orderId: number;
  senderId: number;
  contentType: MessageContentType;
  content: string;
  createdAt: string; // ISO date string
  sender: {
    id: number;
    nickname: string;
    avatar?: string | null;
  };
}

/* ===== 通知 ===== */

export type NotificationType =
  | 'order_taken' | 'order_completed' | 'order_confirmed'
  | 'order_cancelled' | 'review_received' | 'dispute_update' | 'new_message';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  content: string;
  relatedId?: number;
  isRead: boolean;
  createdAt: string;
}

/* ===== 枚举常量 ===== */

export const DEMAND_CATEGORIES: DemandCategory[] = [
  '快递代取', '学习辅导', '二手交易', '活动组队',
  '失物招领', '拼车拼单', '找搭子', '咨询答疑', '其他',
];

export const DEMAND_STATUSES: DemandStatus[] = ['开放', '进行中', '已完成', '已关闭'];

export const ORDER_STATUSES: OrderStatus[] = ['进行中', '待确认', '已完成', '已取消', '纠纷中'];
