import type { RequestHandler } from "express";

export const wrapRequestHandler = (handler: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    try {
      Promise.resolve(handler(req, res, next)).catch(next);
    } catch (error) {
      next(error);
    }
  };
};
