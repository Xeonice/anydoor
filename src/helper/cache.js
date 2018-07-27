const {cache} = require('../config/defaultConfig');

function refreshRes(stats, res) {
  const {maxAge, expires, cacheControl, lastModified, etag} = cache;
  if (expires) {
    res.setHeader('Expires', Date.now() + maxAge * 1000);
  }

  if (cacheControl) {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  }

  if (lastModified) {
    res.setHeader('Last-Modified', stats.mtime.toUTCString());
  }
  if (etag) {
    res.setHeader('ETag', `${stats.size}-${stats.mtime}`);
  }
}

module.exports = function isFresh(stats, req, res) {
  refreshRes(stats, res);//初始化头部
  const lastModified = req.headers['if-modified-since'];
  const etag = req.headers['if-none-match'];
  if (!lastModified && !etag) {//第一次访问
    return false;
  }
  if (lastModified && lastModified !== res.getHeader('Last-modified')) {//是否变动
    return false;
  }
  if (etag && etag !== res.getHeader('ETag')) {
    return false;
  }
  return true;
};