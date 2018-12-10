const express = require('express');
// const request = require('request');
const fetch = require('node-fetch');
const http = require('http');
const fs = require('fs');
const mc = require('./mc');
const yt = require('./yt');

const app = express();

app.get('/links', async (req, res) => {
  console.log('reached /links, req.originalUrl: ', req.originalUrl);
  // const srzJsonGdrive = 'https://drive.google.com/uc?id=1hlydHONBPzhyGFYo6gsacdRzt6_BbX_K&export=download';
  // const ytJsonGdrive = 'https://drive.google.com/uc?id=1n9bMMXY6W20gZ4HlkzRNuKqUpzoneAPc&export=download';
  const srzytJsonGdrive = 'https://drive.google.com/uc?id=1x82UABI2j4NAf3G2BSZqY3_BrPOftgmW&export=download';
  const otherlinkstxtGdrive = 'https://drive.google.com/uc?id=1Go7T001x4t4aTGHqP0BvLtuJNX7QS3pP&export=download';
  // let srzUrlsF = JSON.parse(fs.readFileSync(__dirname + '/store/srz.json'));
  // let ytUrlsF = JSON.parse(fs.readFileSync(__dirname + '/store/yt.json'));
  // let srzUrls = await fetch(srzJsonGdrive).then(resp => resp.json()).catch(err => []);
  // let ytUrls = await fetch(ytJsonGdrive).then(resp => resp.json()).catch(err => []);
  let srzyt = await fetch(srzytJsonGdrive).then(resp => resp.json()).catch(err => ({srz: [], yt: []}));
  let srzUrls = srzyt.srz;
  let ytUrls = srzyt.yt;
  console.log('srzUrls', srzUrls);
  console.log('ytUrls', ytUrls);
  let srzPromises = srzUrls.map(srzUrl =>
    fetch(srzUrl.url)
    .then(resp => resp.text())
    .then(body => {
      // get last updated date
      const dateRgx = /datetime=".+?"/g;
      const dateMatch = body.match(dateRgx)[0];
      const lastUpdated = new Date(dateMatch.slice('datetime="'.length, -1)); // -1 for last "

      // lookbehind (?<=...) not yet supported in node v8.9.4
      // const r = /(?<=Download HEVC.*)(Episode \d+).+?(http:\/\/.*?)(?=" target="_blank" rel="nofollow" class="external">720p HEVC)/g;
      // let match, episodes, urls;
      // while (match = r.exec(body)) {
      //   episodes.push(match[1]);
      //   urls.push(match[2]);
      // }
      // because lookbehind not supported, find the block of text, then find again inside the block
      const hevcRgx = /(?:Download HEVC.*).*(?=720p HEVC)/g;
      match = body.match(hevcRgx);
      let isHevc = true;
      if (!match) {
        const h264Rgx = /Episode \d+ .*http.+?(?=class="external")/g;
        match = body.match(h264Rgx);
        if (!match) { // if no hevc and no h264
          console.log('srz fail, no hevc and h264');
          return {
            isHevc: false,
            lastUpdated: lastUpdated,
            eps: []
          };
        }
        isHevc = false;
      }
      const textBlock = match[0];
      const episodes = textBlock.match(/Episode \d+/g); // ["Episode 01"]
      const urls = textBlock.match(/http.+?(?=")/g); // ["http://ouo.press/asdf"]
      return {
        isHevc: isHevc,
        lastUpdated: lastUpdated,
        eps: episodes.map((e, i) => ({ episode: e, url: urls[i] }))
      };
    })
    .catch(err => {
      console.log('srzPromises catch', err);
    }) // end of fetch
  ); // end of srzPromises
  let srzCombined = Promise.all(srzPromises)
  .then(results => ({
    animes: results.map((e, i) => ({
      anime: srzUrls[i].anime,
      isHevc: e.isHevc,
      lastUpdated: e.lastUpdated,
      episodes: e.eps
    }))
  }))
  .catch(err => {
    console.log('srzCombined catch', err);
  }); // end of srzCombined

  let ytPromises = ytUrls.map(ytUrl =>
    fetch(ytUrl)
    .then(resp => resp.json())
    .then(body => {
      if (body.error) {
        console.log('ytUrl fetch body contains error', ytUrl, body.error.message);
        return { channel: 'error with youtube api', videos: [] };
      }
      return {
        channel: body.items[0].snippet.channelTitle,
        videos: body.items.map(e => ({
          id: e.id.videoId,
          title: e.snippet.title
        }))
      };
    }) // end of fetch
  ); // end of ytPromises
  let ytCombined = Promise.all(ytPromises)
  .then(e => ({youtubes: e}));
  let otherlinkstxtFetch = fetch(otherlinkstxtGdrive).then(resp => resp.text()).catch(err => '');
  Promise.all([srzCombined, ytCombined, otherlinkstxtFetch])
  .then(e => res.send({...e[0], ...e[1], otherlinks: e[2]}))
  .catch(err => {
    console.log('final Promise.all catch', err);
  });
  // fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UCYzPXprvl5Y-Sf0g4vX-m6g&order=date&key=AIzaSyBpu8hgnXbkqFVWrAvwRUEz7T13ii3I7WM')
  // .then(resp => resp.json())
  // .then(body => {
  //   body.items.map(e => {
  //     return { id: e.id.videoId, title: e.snippet.title };
  //   });
  // });
});
app.use('/store', express.static(__dirname + '/store'));
app.post('/store/:file', (req, res, next) => {
  let data = "";
  req.on('data', function(chunk){ data += chunk});
  req.on('end', function(){
    req.rawBody = data;
    next();
  });
}, (req, res) => {
  console.log('reached /store', req.params.file);
  fs.writeFileSync(__dirname + '/store/' + req.params.file, req.rawBody);
  res.sendStatus(200);
});
app.get('/zp', (req, res) => {
  const dir = '/store/zp downloads';
  const folder = __dirname + dir;
  const files = fs.readdirSync(folder);
  let filesResult = {};
  filesResult.files = files.map(file => ({name: file, size: fs.statSync(folder + '/' + file).size}));
  filesResult.totalSize = filesResult.files.reduce((a, c) => a += c.size, 0);
  res.send(filesResult);
});
app.use('/', express.static(__dirname + '/public'));
app.get('/http*', async (req, res) => {
  console.log('reached /http*, req.originalUrl:', req.originalUrl);
  const url = req.url.slice(1);
  if (url.match(/(https:\/\/www.youtube.com\/watch\?v=.+)|(https:\/\/youtu.be\/.+)/g)) {
    console.log('yt: ' + url);
    // const dl = youtube(res, url);
    const ytResolved = await yt(url);
    if (ytResolved.match(/http.+/)) {
      res.redirect(ytResolved);
    } else {
      res.send(ytResolved);
    }
  } else if (url.match(/(https:\/\/www.mirrored.to\/files\/.+)/g)) {
    const mcResolved = await mc(url);
    if (mcResolved) {
      console.log('mcResolved: ', mcResolved);
      const dir = '/store/zp downloads/';
      const path = await fetch(mcResolved)
      .then(res => {
        const filename = decodeURIComponent(res.headers.get('content-disposition')).match(/\[Soulreaperzone\.com\].+/)[0];
        console.log('filename: ', filename);
        if (fs.existsSync(__dirname + dir + filename)) {
          console.log('file exists: ', filename);
          return '/store/zp downloads/' + filename;
        } else {
          const folder = dir.replace(/\/$/, '');
          const folderSize = fs.readdirSync(__dirname + folder).map(file => fs.statSync(__dirname + folder + '/' + file).size).reduce((a, c) => a += c, 0);
          if (folderSize > 900000000) { // heroku max size 1GB, so if exceeds 900MB, clear folder
            fs.readdirSync(__dirname + folder).forEach(file => fs.unlinkSync(__dirname + folder  + '/' + file)); // loop files and delete
            console.log('zp downloads folder size ' + (folderSize / 1000000) + 'MB > 900MB, cleared zp downloads');
          }
          console.log('downloading ' + filename);
          return new Promise((resolve, reject) => {
            const dest = fs.createWriteStream(__dirname + dir + filename);
            res.body.pipe(dest);
            res.body.on('error', err => {
              console.log('res.body error, ', err);
              reject(err);
            });
            dest.on('finish', () => {
              console.log('download done ' + filename);
              resolve(dir + filename);
            });
            dest.on('error', err => {
              console.log('dest error, ', err);
              reject(err);
            });
          });
        }
      });
      console.log('path: ', path);
      res.download(__dirname + path);
    }
  } else {
    res.sendStatus(400);
  }
});
app.listen(process.env.PORT || 8080);
console.log('express server running');


// function youtube(res, u) {
//   request.post({
//     url: 'https://www.clipconverter.cc/check.php',
//     form: {mediaurl: u}
//   },
//     function(e,r,b){
//       var j = JSON.parse(b);
//       if (j.redirect && j.redirect.includes('captcha')){
//         console.log('needs recaptcha');
//         res.send('needs recaptcha');
//       } else {
//         var filename = encodeURIComponent(j.filename).replace(/%20/g, '+');
//         console.log(filename);
//         if (typeof(j.url) == 'undefined') {
//           console.log(j);
//           return;
//         }
//         // if (j.url.find(e => e.text.includes('(720p)'))) {
//         //  json = j.url.find(e => e.text.includes('(720p)'));
//         // } else if (j.url.find(e => e.text.includes('(720p), 60fps'))) {
//         //  json = j.url.find(e => e.text.includes('(720p), 60fps'));
//         // } else {
//         //   console.log('No 720p available for ' + u + ' :\n');
//         //   j.url.forEach(e => console.log(e.text + '\n'));
//         //   return;
//         // }
//         if (j.url.find(e => e.text.includes('(3GP)'))) {
//           json = j.url.find(e => e.text.includes('(3GP)'));
//         } else {
//           console.log('No 3GP available for ' + u + ' :\n');
//           j.url.forEach(e => console.log(e.text + '\n'));
//           // return;
//           res.send('no 3gp available :(');
//         }
//         console.log('URL before replace:\n' + json.url);
//         url = json.url.replace(/&#type=3gp(.*)/g, '&&title=' + filename);
//         // console.log(json);
//         console.log('  URL:  ' + url);
//         var filesystemfriendlyname = j.filename.replace(/[\\/\:\*?"<>|]/g, '-');
//         console.log(filesystemfriendlyname + '\n' + url + '\n');
//         // child.spawn('idman', ['/a', '/d', url, '/f', filesystemfriendlyname+'.mp4']);
//         // return {url: url, filesystemfriendlyname, filesystemfriendlyname};
//         res.redirect(url);
//       }
//     }
//   );
// }