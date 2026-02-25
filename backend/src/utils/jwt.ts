import jwt from 'jsonwebtoken'

export const generateAccessToken = (payload: object): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  })
}

export const generateRefreshToken = (payload: object): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  })
}

export const verifyRefreshToken = (token: string): jwt.JwtPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
    algorithms: ['HS256'],
  }) as jwt.JwtPayload
}
