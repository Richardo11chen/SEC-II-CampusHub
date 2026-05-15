export const uploadService = {
  getUrl(file: Express.Multer.File): { url: string } {
    const relativePath = file.path.replace(/\\/g, '/');
    const uploadsIndex = relativePath.indexOf('uploads/');
    const url = '/' + relativePath.slice(uploadsIndex);
    return { url };
  },
};
