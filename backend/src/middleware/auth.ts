import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";


const SECRET = process.env.JWT_SECRET || "dev_secret";


export interface AuthRequest extends Request {
    user?: any;
}


export function auth(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {

    const header = req.headers.authorization;


    if (!header) {
        return res.status(401).json({
            error: "Token manquant"
        });
    }


    const token = header.split(" ")[1];


    try {

        const decoded = jwt.verify(
            token,
            SECRET
        );


        req.user = decoded;

        next();


    } catch {

        return res.status(401).json({
            error: "Token invalide"
        });

    }

}