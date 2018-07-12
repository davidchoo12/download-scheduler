const express = require('express');
const request = require('request');

const app = express();

app.get('/*', (req, res) => {
  const url = req.url.slice(1);
  console.log('asdf', url);
  if (url.match(/https:\/\/www.youtube.com\/watch\?v=.+/g)) {
    const dl = youtube(res, url);
    console.log('yt: ' + url);
    // res.redirect(dl.url);
  } else {
    res.status(400);
  }
});
app.listen(process.env.PORT || 8080);
console.log('express server running');


function youtube(res, u) {
  request.post({
    url: 'https://www.clipconverter.cc/check.php',
    form: {mediaurl: u}
  },
    function(e,r,b){
      var j = JSON.parse(b);
      if (j.redirect && j.redirect.includes('captcha')){
        console.log('needs recaptcha');
        res.send('needs recaptcha');
      } else {
        var filename = encodeURIComponent(j.filename).replace(/%20/g, '+');
        console.log(filename);
        if (typeof(j.url) == 'undefined') {
          console.log(j);
          return;
        }
        // if (j.url.find(e => e.text.includes('(720p)'))) {
        //  json = j.url.find(e => e.text.includes('(720p)'));
        // } else if (j.url.find(e => e.text.includes('(720p), 60fps'))) {
        //  json = j.url.find(e => e.text.includes('(720p), 60fps'));
        // } else {
        //   console.log('No 720p available for ' + u + ' :\n');
        //   j.url.forEach(e => console.log(e.text + '\n'));
        //   return;
        // }
        if (j.url.find(e => e.text.includes('(3GP)'))) {
          json = j.url.find(e => e.text.includes('(3GP)'));
        } else {
          console.log('No 3GP available for ' + u + ' :\n');
          j.url.forEach(e => console.log(e.text + '\n'));
          // return;
          res.send('no 3gp available :(');
        }
        url = json.url.replace(/&#type=3gp(.*)/g, '&&title=' + filename);
        // console.log(json);
        console.log('  URL:  ' + url);
        var filesystemfriendlyname = j.filename.replace(/[\\/\:\*?"<>|]/g, '-');
        console.log(filesystemfriendlyname + '\n' + url + '\n');
        // child.spawn('idman', ['/a', '/d', url, '/f', filesystemfriendlyname+'.mp4']);
        // return {url: url, filesystemfriendlyname, filesystemfriendlyname};
        res.redirect(url);
      }
    }
  );
}