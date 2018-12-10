const fetch = require('node-fetch');
const { URL } = require('url');

async function zp(url) {
  return await fetch(url)
  .then(res => res.text())
  .then(body => {
    let dlbuttonHrefMatch = body.match(/document.getElementById\('dlbutton'\).href = (.*);/);
    if (!dlbuttonHrefMatch) {
      throw new Error(`couldn't find zippyshare dlbutton href code, possibly file expired:\n  zp url: ${url}`);
    }
    let code = dlbuttonHrefMatch[1];
    code = code.replace('a()', 1);
    code = code.replace('b()', 2);
    code = code.replace('c()', 3);
    code = code.replace('+ d +', '+ 4 +');
    let dlurl = new URL(eval(code), url).href;
    if (dlurl.indexOf('undefined') > 0) {
      return undefined;
    }
    return dlurl;
  })
  .catch(err => {
    console.error('zp error', err);
    return err;
  });
}

module.exports = zp;