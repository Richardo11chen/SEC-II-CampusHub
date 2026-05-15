import { Request, Response, NextFunction } from 'express';
import { uploadService } from '../service/upload-service.js';
import { createdResponse, BadRequestError } from '@campushub/shared';

export const uploadController = {
  upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new BadRequestError('请选择要上传的文件');
      }
      const result = uploadService.getUrl(req.file);
      createdResponse(res, result, '上传成功');
    } catch (error) {
      next(error);
    }
  },
};
