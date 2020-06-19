const fetch = require('node-fetch');

async function mediafire(url) {
  return await fetch(url)
  .then(res => res.text())
  .then(body => {
    let dlUrl = body.match(/(http.*?)">\s*Download/)[1];
    return dlUrl;
  })
  .catch(err => {
    console.error('mediafire error', err);
    return err;
  });
}

module.exports = mediafire;