function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) {
    return xf.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || null;
}

module.exports = { clientIp };
