import jwt from 'jsonwebtoken'

function getSecret(name: string): string {
  const secret = process.env[name]
  if (!secret) throw new Error(`${name} environment variable is not set`)
  return secret
}

export const generateAccessToken = (payload: object): string => {
  return jwt.sign(payload, getSecret('JWT_SECRET'), {
    expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  })
}

export const generateRefreshToken = (payload: object): string => {
  return jwt.sign(payload, getSecret('JWT_REFRESH_SECRET'), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '90d') as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  })
}

export const verifyRefreshToken = (token: string): jwt.JwtPayload => {
  return jwt.verify(token, getSecret('JWT_REFRESH_SECRET'), {
    algorithms: ['HS256'],
  }) as jwt.JwtPayload
}
