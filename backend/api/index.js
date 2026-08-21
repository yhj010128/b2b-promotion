// Vercel의 서버리스 런타임은 IPv6을 우선 시도하는데, Supabase pooler 호스트가
// IPv6로 연결이 안 되는 네트워크에서는 응답 없이 연결이 무한 대기 상태가 된다.
// IPv4를 우선하도록 강제해 이 행(hang)을 방지한다.
require('dns').setDefaultResultOrder('ipv4first');

module.exports = require('../src/app');
