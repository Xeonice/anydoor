const fs = require('fs');
const path = require('path');
const Handlebars =  require('handlebars');
const promisify = require('util').promisify;
const stat = promisify(fs.stat);//将异步模块转换为 promise 对象
const readdir = promisify(fs.readdir);
const mime = require('./mime');
const compress = require('./compress');
const range = require('./range');
const isFresh = require('./cache');

const tplPtah = path.join(__dirname, '../template/dir.tpl')
const source = fs.readFileSync(tplPtah);//必须等待这个请求结束才能渲染，因此需要同步加载
//只会执行一次，之后会调用缓存
const template = Handlebars.compile(source.toString());//Buffer 转 Str

module.exports = async function (req, res, filePath, config) {
  try {
    const stats = await stat(filePath);//返回回调成功结果
    if (stats.isFile()) {
      const contentType = mime(filePath);
      res.setHeader('Content-Type', contentType);//文件时需要识别 MIME 类型

      if (isFresh(stats, req, res)) {
        res.statusCode = 304;
        res.end();
        return;
      }

      //fs.readfile 读取速度过慢，必须全部读取完毕后才能输出
      let rs;
      const {code, start, end} = range(stats.size, req, res);//ES6中的解析功能
      if(code === 200) {//处理不成，直接全量返回
        res.statusCode = 200;
        rs = fs.createReadStream(filePath);
      } else {
        res.statusCode = 206;
        rs = fs.createReadStream(filePath, {start, end});//根据客户端请求返回部分内容
      }
      if(filePath.match(config.compress)) {//符合配置中要求的压缩文件类型时
        rs = compress(rs, req, res);//对文件进行压缩（优先gzip）
      }
      rs.pipe(res);//可以一边读取一边输出，在异步环境下效果更好
    } else if (stats.isDirectory()) {
      const files = await readdir(filePath);//返回回调成功结果
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');//文件夹时返回 HTML 文件
      const dir = path.relative(config.root, filePath);
      const data = {
        title: path.basename(filePath),
        dir: dir ? `/${dir}` : '',
        files
      }
      res.end(template(data));
    }
  } catch (ex) {
    console.error(ex);//接收回调失败结果
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');//找不到时直接返回文本
    res.end(`${filePath} is not a directory or file`);
  }
}