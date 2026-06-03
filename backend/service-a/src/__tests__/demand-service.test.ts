import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@campushub/shared', () => ({
  demandRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    updateWithVersion: vi.fn(),
    delete: vi.fn(),
  },
  demandImageRepository: {
    createMany: vi.fn(),
    deleteByDemandId: vi.fn(),
  },
  resolvePublisher: vi.fn(),
  NotFoundError: class extends Error {
    statusCode = 404;
    constructor(message = '资源不存在') { super(message); }
  },
  ForbiddenError: class extends Error {
    statusCode = 403;
    constructor(message = '权限不足') { super(message); }
  },
  ConflictError: class extends Error {
    statusCode = 409;
    constructor(message = '资源冲突') { super(message); }
  },
}));

import { demandService } from '../service/demand-service.js';

const shared = await import('@campushub/shared');

describe('demandService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDemand', () => {
    it('should create demand without images', async () => {
      (shared.demandRepository.create as any).mockResolvedValue({ id: 1 });
      (shared.demandRepository.findById as any).mockResolvedValue({
        id: 1,
        title: '测试需求',
        images: [],
      });

      const result = await demandService.createDemand(1, {
        title: '测试需求',
        description: '描述',
        category: '学习辅导',
        reward: 50,
      });

      expect(result!.id).toBe(1);
      expect(shared.demandRepository.create).toHaveBeenCalled();
      expect(shared.demandImageRepository.createMany).not.toHaveBeenCalled();
    });

    it('should create demand with images', async () => {
      (shared.demandRepository.create as any).mockResolvedValue({ id: 1 });
      (shared.demandRepository.findById as any).mockResolvedValue({
        id: 1,
        title: '测试需求',
        images: [{ id: 1, url: 'http://img.jpg', sortOrder: 0 }],
      });

      const result = await demandService.createDemand(1, {
        title: '测试需求',
        description: '描述',
        category: '学习辅导',
        reward: 50,
        images: [{ url: 'http://img.jpg', sortOrder: 0 }],
      });

      expect(result!.id).toBe(1);
      expect(shared.demandImageRepository.createMany).toHaveBeenCalledWith([
        { demandId: 1, url: 'http://img.jpg', sortOrder: 0 },
      ]);
    });

    it('should create demand with empty images array', async () => {
      (shared.demandRepository.create as any).mockResolvedValue({ id: 1 });
      (shared.demandRepository.findById as any).mockResolvedValue({ id: 1, images: [] });

      await demandService.createDemand(1, {
        title: '测试',
        description: '描述',
        category: '学习辅导',
        reward: 50,
        images: [],
      });

      expect(shared.demandImageRepository.createMany).not.toHaveBeenCalled();
    });

    it('should set default isUrgent and isAnonymous to false', async () => {
      (shared.demandRepository.create as any).mockResolvedValue({ id: 1 });
      (shared.demandRepository.findById as any).mockResolvedValue({ id: 1 });

      await demandService.createDemand(1, {
        title: '测试',
        description: '描述',
        category: '学习辅导',
        reward: 50,
      });

      const createCall = (shared.demandRepository.create as any).mock.calls[0][0];
      expect(createCall.isUrgent).toBe(false);
      expect(createCall.isAnonymous).toBe(false);
    });
  });

  describe('getDemandList', () => {
    it('should return paginated demand list', async () => {
      (shared.demandRepository.findMany as any).mockResolvedValue({
        items: [{ id: 1, title: '需求1' }],
        total: 1,
      });

      const result = await demandService.getDemandList({ page: 1, pageSize: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getDemandDetail', () => {
    const baseDemand = {
      id: 1,
      publisherId: 10,
      title: '测试需求',
      isAnonymous: false,
      publisher: { id: 10, nickname: '小明', avatar: null, creditScore: 70 },
      images: [],
      order: null,
    };

    it('should return demand detail', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(baseDemand);

      const result = await demandService.getDemandDetail(1, 10);

      expect(result.id).toBe(1);
      expect(result.currentOrder).toBeNull();
    });

    it('should throw NotFoundError if demand not found', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(null);

      await expect(
        demandService.getDemandDetail(999),
      ).rejects.toThrow('需求不存在');
    });

    it('should resolve anonymous publisher for non-owner', async () => {
      const anonDemand = { ...baseDemand, isAnonymous: true };
      (shared.demandRepository.findById as any).mockResolvedValue(anonDemand);
      (shared.resolvePublisher as any).mockResolvedValue({
        nickname: '匿名用户',
        avatar: null,
        creditScore: null,
      });

      const result = await demandService.getDemandDetail(1, 99);

      expect(shared.resolvePublisher).toHaveBeenCalled();
      expect(result.publisher.nickname).toBe('匿名用户');
    });

    it('should resolve anonymous publisher for owner (show real info)', async () => {
      const anonDemand = { ...baseDemand, isAnonymous: true };
      (shared.demandRepository.findById as any).mockResolvedValue(anonDemand);
      (shared.resolvePublisher as any).mockResolvedValue(null);

      const result = await demandService.getDemandDetail(1, 10);

      expect(shared.resolvePublisher).toHaveBeenCalled();
      expect(result.publisher).toEqual(baseDemand.publisher);
    });

    it('should include currentOrder when order exists', async () => {
      const demandWithOrder = {
        ...baseDemand,
        order: { id: 5, providerId: 20, status: '进行中' },
      };
      (shared.demandRepository.findById as any).mockResolvedValue(demandWithOrder);

      const result = await demandService.getDemandDetail(1);

      expect(result.currentOrder).toEqual({ id: 5, providerId: 20, status: '进行中' });
    });
  });

  describe('updateDemand', () => {
    const baseDemand = {
      id: 1,
      publisherId: 10,
      status: '开放',
      version: 1,
      title: '旧标题',
    };

    it('should update demand successfully', async () => {
      (shared.demandRepository.findById as any)
        .mockResolvedValueOnce(baseDemand)  // first call: validate
        .mockResolvedValueOnce({ ...baseDemand, title: '新标题' });  // second call: return updated
      (shared.demandRepository.updateWithVersion as any).mockResolvedValue(1);

      const result = await demandService.updateDemand(1, 10, 1, { title: '新标题' });

      expect(result!.title).toBe('新标题');
      expect(shared.demandRepository.updateWithVersion).toHaveBeenCalledWith(1, 1, { title: '新标题' });
    });

    it('should update images when provided', async () => {
      (shared.demandRepository.findById as any)
        .mockResolvedValueOnce(baseDemand)
        .mockResolvedValueOnce(baseDemand);
      (shared.demandRepository.updateWithVersion as any).mockResolvedValue(1);

      await demandService.updateDemand(1, 10, 1, {
        images: [{ url: 'http://new.jpg', sortOrder: 0 }],
      });

      expect(shared.demandImageRepository.deleteByDemandId).toHaveBeenCalledWith(1);
      expect(shared.demandImageRepository.createMany).toHaveBeenCalled();
    });

    it('should delete images when empty array provided', async () => {
      (shared.demandRepository.findById as any)
        .mockResolvedValueOnce(baseDemand)
        .mockResolvedValueOnce(baseDemand);
      (shared.demandRepository.updateWithVersion as any).mockResolvedValue(1);

      await demandService.updateDemand(1, 10, 1, { images: [] });

      expect(shared.demandImageRepository.deleteByDemandId).toHaveBeenCalledWith(1);
      expect(shared.demandImageRepository.createMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if demand not found', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(null);

      await expect(
        demandService.updateDemand(999, 10, 1, { title: 'x' }),
      ).rejects.toThrow('需求不存在');
    });

    it('should throw ForbiddenError if not publisher', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(baseDemand);

      await expect(
        demandService.updateDemand(1, 99, 1, { title: 'x' }),
      ).rejects.toThrow('只能修改自己的需求');
    });

    it('should throw ForbiddenError if demand not in open status', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue({
        ...baseDemand,
        status: '进行中',
      });

      await expect(
        demandService.updateDemand(1, 10, 1, { title: 'x' }),
      ).rejects.toThrow('只能修改开放状态的需求');
    });

    it('should throw ConflictError on version conflict', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(baseDemand);
      (shared.demandRepository.updateWithVersion as any).mockResolvedValue(0);

      await expect(
        demandService.updateDemand(1, 10, 1, { title: 'x' }),
      ).rejects.toThrow('需求已被修改，请刷新后重试');
    });
  });

  describe('deleteDemand', () => {
    const baseDemand = {
      id: 1,
      publisherId: 10,
      status: '开放',
    };

    it('should delete demand successfully', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(baseDemand);

      await demandService.deleteDemand(1, 10);

      expect(shared.demandRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError if demand not found', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(null);

      await expect(
        demandService.deleteDemand(999, 10),
      ).rejects.toThrow('需求不存在');
    });

    it('should throw ForbiddenError if not publisher', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue(baseDemand);

      await expect(
        demandService.deleteDemand(1, 99),
      ).rejects.toThrow('只能删除自己的需求');
    });

    it('should throw ForbiddenError if demand not in open status', async () => {
      (shared.demandRepository.findById as any).mockResolvedValue({
        ...baseDemand,
        status: '进行中',
      });

      await expect(
        demandService.deleteDemand(1, 10),
      ).rejects.toThrow('只能删除开放状态的需求');
    });
  });
});
