const fetch = require('node-fetch');

async function yt(url) {
  return await fetch('https://www.clipconverter.cc/check.php', {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: 'mediaurl=' + url
  })
  .then(res => res.json())
  .then(body => {
    if (body.redirect && body.redirect.includes('captcha')) {
      console.log('needs recaptcha');
      return 'needs recaptcha';
    } else {
      let filename = encodeURIComponent(body.filename).replace(/%20/g, '+');
      // console.log(filename);
      if (typeof(body.url) == 'undefined') {
        // console.log(body);
        return 'body.url is undefined';
      }
      let json;
      if (body.url.find(e => e.text.includes('(720p)'))) {
        json = body.url.find(e => e.text.includes('(720p)'));
      } else if (body.url.find(e => e.text.includes('(720p), 60fps'))) {
        json = body.url.find(e => e.text.includes('(720p), 60fps'));
      } else if (body.url.find(e => e.text.includes('(3GP)'))) {
        json = body.url.find(e => e.text.includes('(3GP)'));
      } else {
        console.log('None available for ' + url + ' :\n');
        body.url.forEach(e => console.log(e.text + '\n'));
        return 'no 720p nor 720p 60fps nor 3gp available :(';
      }
      // if (body.url.find(e => e.text.includes('(720p)'))) {
      //   json = body.url.find(e => e.text.includes('(720p)'));
      // } else if (body.url.find(e => e.text.includes('(720p), 60fps'))) {
      //   json = body.url.find(e => e.text.includes('(720p), 60fps'));
      // } else {
      //   console.log('No 720p available for ' + u + ' :\n');
      //   body.url.forEach(e => console.log(e.text + '\n'));
      //   return;
      // }
      // if (body.url.find(e => e.text.includes('(3GP)'))) {
      //   json = body.url.find(e => e.text.includes('(3GP)'));
      // } else {
        // console.log('No 3GP available for ' + url + ' :\n');
        // body.url.forEach(e => console.log(e.text + '\n'));
        // return 'no 3gp available :(';
        // return 'no 720p nor 720p 60fps nor 3gp available :(';
      // }
      console.log('URL before replace:\n' + json.url);
      url = json.url.replace(/&#.*/g, '&&title=' + filename); // replace everything from '&#'
      // console.log(json);
      // console.log('  URL:  ' + url);
      // let filesystemfriendlyname = body.filename.replace(/[\\/\:\*?"<>|]/g, '-');
      // console.log(filesystemfriendlyname + '\n' + url + '\n');
      // child.spawn('idman', ['/a', '/d', url, '/f', filesystemfriendlyname+'.mp4']);
      // return {url: url, filesystemfriendlyname, filesystemfriendlyname};
      return url;
    }
  });
}

module.exports = yt;
