const fetch = require('node-fetch');
const zp = require('./zp');

async function mc(url) {
  const fileid = url.match(/\/files\/(.+)(?=\/)/g)[0].slice(7);
  return await fetch('https://www.mirrored.to/downlink/' + fileid, {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: 'hostname=ZippyShare&hostid=15&uid=' + fileid
  })
  .then(res => res.text())
  .then(body => {
    if(body.match(/http.+zippyshare.com.+html/g))
      return zp(body.match(/http.+zippyshare.com.+html/g)[0]);
    else
      return undefined;
  });
}

module.exports = mc;