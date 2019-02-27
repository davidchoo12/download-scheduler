const fetch = require('node-fetch');
const { URL } = require('url');

async function zp(url) {
  return await fetch(url)
  .then(res => res.text())
  .then(body => {// let dlbuttonHrefMatch = body.match(/document.getElementById\('dlbutton'\).href = (.*);/);
    let scripts = body.match(/<script type="text\/javascript">[\s\S]+?<\/script>/g); // find all scripts enclosed in <script type="text/javascript">...</script>
    let dlbuttonScript = scripts.find(e => e.match(/document.getElementById\('dlbutton'\).href/)); // find dlbutton script
    if (!dlbuttonScript) {
      throw new Error(`couldn't find zippyshare dlbutton href code, possibly file expired:\n  zp url: ${url}`);
    }
    dlbuttonScript = dlbuttonScript.match(/<script type="text\/javascript">([\s\S]+?)<\/script>/)[1]; // remove script tags
    let dlbutton = {}; // to replace document.getElementById('dlbutton') for eval
    dlbuttonScript = dlbuttonScript.replace(/document.getElementById\('dlbutton'\)/g, 'dlbutton');
    // find last line of dlbutton code up to its ; and remove the rest of the script after that
    dlbuttonScript = dlbuttonScript.slice(0, dlbuttonScript.indexOf(';', dlbuttonScript.lastIndexOf('dlbutton')) + 1); // +1 to include the ;
    eval(dlbuttonScript);
    let dlurl = new URL(dlbutton.href, url).href;
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