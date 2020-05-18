const OSS = require('ali-oss');
const path = require('path');
const fs = require('fs');
const argvObj = process.argv.splice(2).reduce((obj, cur) => {
    item = cur.split("=");
    obj[item[0]] = item[1];
    return obj
}, {});
console.log("process.argv", process.argv);
console.log("argvObj", argvObj);
const publicPath = path.resolve(argvObj.publicPath);
const client = new OSS({
    region: argvObj.region,
    accessKeyId: argvObj.accessKeyId,
    accessKeySecret: argvObj.accessKeySecret,
    bucket: argvObj.bucket,
    timeout: 99999999
});
const preDirPath = argvObj.preDirPath || 'jianqiao0313.github.io';
// 上传进度
let uploadProgress = 0;
let totalFile = 0;
async function list() {
    try {
        let res = [];
        // 不带任何参数，默认最多返回1000个文件。
        let result = await client.list();
        res = result.objects;
        // 根据nextMarker继续列出文件。
        while (result.isTruncated) {
            result = await client.list({
                marker: result.nextMarker
            });
            res = res.concat(result.objects);
        }
        // 如果res为undefined 代表oss已经为空了
        if (res) {
            delres = await deleteMulti(res.map(temp => temp.name))
        } else {
            readDir();
        }
    } catch (e) {
        console.log(e);
    }
}
async function deleteMulti(arr) {
    try {
        let result = await client.deleteMulti(arr, {
            quiet: true
        });
        console.log(`删除所有文件状态码：${result.res.statusCode}, 删除结果：${result.res.statusMessage}`);
        if (result.res.statusCode === 200) {
            readDir();
        }
    } catch (e) {
        console.log(`删除所有文件报错：${e}`);
    }
}
async function uploadFileToOss(_path, fileStream) {
    try {
        //object-name可以自定义为文件名（例如file.txt）或目录（例如abc/test/file.txt）的形式，实现将文件上传至当前Bucket或Bucket下的指定目录。
        let result = await client.put(_path, fileStream);
        console.log(`[${++uploadProgress}|${totalFile}]上传文件：${_path},状态码：${result.res.statusCode}，上传结果：${result.res.statusMessage}`);
    } catch (e) {
        console.log(`上传文件报错：${e},${_path}`);
    }
}
function readDir(proPath = '') {
    res = fs.readdirSync(path.resolve(publicPath, proPath));
    res.forEach(item => {
        if (item.indexOf('.git') === -1) {
            let _path = path.resolve(publicPath, proPath, item);
            fileStats = fs.statSync(_path);
            if (fileStats.isFile()) {
                totalFile++;
                let fileStream = fs.createReadStream(_path);
                _pathArr = _path.split(path.sep);
                dirIndex = _pathArr.lastIndexOf(preDirPath);
                uploadFileToOss(_pathArr.splice(dirIndex + 1).join('/'), fileStream);
            } else {
                readDir(path.resolve(_path));
            }
        }
    })
}
// readDir();
list();
