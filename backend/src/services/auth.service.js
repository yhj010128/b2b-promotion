const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const usersDb = require('../db/users.db');

class AuthError extends Error {}

function issueTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES }
  );
  const refreshToken = jwt.sign(
    { sub: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES }
  );
  return { accessToken, refreshToken };
}

async function login(loginId, password) {
  const user = await usersDb.findByLoginId(loginId);
  if (!user) {
    throw new AuthError('로그인id 또는 비밀번호가 올바르지 않습니다');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AuthError('로그인id 또는 비밀번호가 올바르지 않습니다');
  }

  const tokens = issueTokens(user);
  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
  await usersDb.updateRefreshTokenHash(user.id, refreshTokenHash);

  return tokens;
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AuthError('유효하지 않은 refresh token입니다');
  }

  const user = await usersDb.findById(payload.sub);
  if (!user || !user.refresh_token_hash) {
    throw new AuthError('유효하지 않은 refresh token입니다');
  }

  const tokenMatches = await bcrypt.compare(refreshToken, user.refresh_token_hash);
  if (!tokenMatches) {
    throw new AuthError('유효하지 않은 refresh token입니다');
  }

  const tokens = issueTokens(user);
  const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
  await usersDb.updateRefreshTokenHash(user.id, newRefreshTokenHash);

  return tokens;
}

module.exports = { login, refresh, AuthError };
