import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
export type AuthUser = { id:string; role:'CUSTOMER'|'WORKER'|'ADMIN'; email:string };
declare global { namespace Express { interface Request { user?: AuthUser; requestId?: string } } }
export const ok=(res:Response,data:unknown,status=200)=>res.status(status).json({data,requestId:res.getHeader('x-request-id')});
export const fail=(res:Response,status:number,code:string,message:string,details:unknown={})=>res.status(status).json({error:{code,message,details},requestId:res.getHeader('x-request-id')});
export function auth(req:Request,res:Response,next:NextFunction){
 const token=req.cookies?.coopgig_token || (req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):undefined);
 if(!token) return fail(res,401,'UNAUTHENTICATED','Authentication required');
 try { req.user=jwt.verify(token,config.jwtSecret) as AuthUser; next(); } catch { return fail(res,401,'INVALID_TOKEN','Session is invalid or expired'); }
}
export const allow=(...roles:AuthUser['role'][])=>(req:Request,res:Response,next:NextFunction)=>req.user&&roles.includes(req.user.role)?next():fail(res,403,'FORBIDDEN','Insufficient permissions');
export const asyncRoute=(fn:(req:Request,res:Response,next:NextFunction)=>Promise<unknown>)=>(req:Request,res:Response,next:NextFunction)=>Promise.resolve(fn(req,res,next)).catch(next);
