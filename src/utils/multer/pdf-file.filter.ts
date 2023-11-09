import { Request } from 'express';
import { HttpException, HttpStatus } from '@nestjs/common';

export const pdfFileFilter = (req: Request, file: any, callback: any) => {
  if (!file.originalname.match(/\.(pdf)$/)) {
    return callback(
      new HttpException('Only pdf files are allowed.', HttpStatus.FORBIDDEN),
      false,
    );
  }
  callback(null, true);
};
