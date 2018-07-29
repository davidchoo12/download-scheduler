const fetch = require('node-fetch');
const zp = require('./zp');

async function mc(url) {
  return await fetch('https://www.mirrored.to/downlink.php', {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: 'hostid=15&uid=' + url.match(/\/files\/(.+)(?=\/)/g)[0].slice(7)
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