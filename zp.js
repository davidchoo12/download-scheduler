const fetch = require('node-fetch');
const { URL } = require('url');

async function zp(url) {
  return await fetch(url)
  .then(res => res.text())
  .then(body => {
    let dlurl = new URL(eval(body.match(/document.getElementById\('dlbutton'\).href = (.*);/)[1]), url).href;
    if (dlurl.indexOf('undefined') > 0) {
      return undefined;
    }
    return dlurl;
  });
}

module.exports = zp;