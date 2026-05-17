function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  const xri = req.headers['x-real-ip'];
  if (typeof xri === 'string' && xri.length > 0) {
    return xri.trim();
  }
  return req.ip || null;
}

module.exports = { clientIp };
