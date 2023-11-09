import { Request } from 'express';
import { v4 as uuid } from 'uuid';

export const pdfFileNameFactory = (req: Request, file: any, callback: any) => {
  const name = uuid() + '.pdf';
  callback(null, name);
};
