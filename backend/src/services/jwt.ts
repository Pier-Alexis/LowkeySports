import jwt from "jsonwebtoken";


const SECRET = process.env.JWT_SECRET || "dev_secret";


export function createToken(user: any) {

    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role
        },
        SECRET,
        {
            expiresIn: "7d"
        }
    );

}