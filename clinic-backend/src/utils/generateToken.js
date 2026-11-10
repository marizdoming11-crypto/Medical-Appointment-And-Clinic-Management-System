
import jwt from "jsonwebtoken";

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.user_id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d"
    }
  );
};

export default generateToken;
