module.exports = (totalSize, req, res) => {
  const range = req.headers['range'];
  if (!range) {
    return {code: 200};
  }
  const sizes = range.match(/bytes=(\d*)-(\d*)/);//获取req中的起始点和终结点
  const end = sizes[2] || totalSize - 1;//最后匹配的是终结点
  const start = sizes[1] || totalSize - end;//第一个匹配的是起始点
  if (start > end || start < 0 || end > totalSize) {//当起始>结束，起始<0，结束>总数
    return {code: 200};//无法处理，全量返回
  }
  //符合条件，设置头文件
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
  res.setHeader('Content-Length', end - start);
  return {
    code: 206,
    start: parseInt(start),
    end: parseInt(end)
  };
};