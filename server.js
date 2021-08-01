const express = require('express');
// const request = require('request');
const fetch = require('node-fetch');
const http = require('http');
const fs = require('fs');
const mc = require('./mc');
const mediafire = require('./mediafire');
const zp = require('./zp');
const yt = require('./yt');

const app = express();

app.get('/links', async (req, res) => {
  console.log('reached /links, req.originalUrl: ', req.originalUrl);
  // const srzJsonGdrive = 'https://drive.google.com/uc?id=1hlydHONBPzhyGFYo6gsacdRzt6_BbX_K&export=download';
  // const ytJsonGdrive = 'https://drive.google.com/uc?id=1n9bMMXY6W20gZ4HlkzRNuKqUpzoneAPc&export=download';
  const srzytJsonGdrive = 'https://drive.google.com/uc?id=1x82UABI2j4NAf3G2BSZqY3_BrPOftgmW&export=download';
  const otherlinkstxtGdrive = 'https://drive.google.com/uc?id=1Go7T001x4t4aTGHqP0BvLtuJNX7QS3pP&export=download';
  const sznDbCsv = 'https://docs.google.com/spreadsheets/d/1aB4PB2e5We7FC2qSM3umg3-7KmCxJjiskOubc-qo724/export?format=csv&id=1aB4PB2e5We7FC2qSM3umg3-7KmCxJjiskOubc-qo724&gid=0';
  // let srzUrlsF = JSON.parse(fs.readFileSync(__dirname + '/store/srz.json'));
  // let ytUrlsF = JSON.parse(fs.readFileSync(__dirname + '/store/yt.json'));
  // let srzUrls = await fetch(srzJsonGdrive).then(resp => resp.json()).catch(err => []);
  // let ytUrls = await fetch(ytJsonGdrive).then(resp => resp.json()).catch(err => []);
  const fetchOpts = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0'
    }
  };
  let srzyt = await fetch(srzytJsonGdrive, fetchOpts).then(resp => resp.json()).catch(err => ({srz: [], yt: []}));
  let srzUrls = srzyt.srz;
  let ytUrls = srzyt.yt;
  console.log('srzUrls', srzUrls);
  console.log('ytUrls', ytUrls);
  let srzPromises = srzUrls.map(srzUrl => {
    if (srzUrl.url.match(/.+anime2enjoy.+/)) {
      return fetch(srzUrl.url)
      .then(resp => resp.text())
      .then(body => {
        // get last updated date
        const dateRgx = /Posted on [^>]+>([^<]*)/;
        let dateMatch = body.match(dateRgx);
        let lastUpdated = 'failed to find date';
        if (dateMatch) {
          dateMatch = dateMatch[1];
          lastUpdated = new Date(dateMatch);
        } else {
          console.log('failed to match date, request body:', body);
        }
        const episodes = body.match(/(?<=modal-title">Download )(.+)(?=<\/h4>)/g).reverse(); // ['Episode 01'] reversed so that newer ones appear on top
        const urls = body.match(/(?<=data-href=")(http[s]:\/\/[^"]+)/g).reverse(); // ['https://ouo.io/asdf']
        console.log(`episodes ${episodes} urls ${urls}`);
        return {
          isHevc: true,
          lastUpdated: lastUpdated,
          eps: episodes.map((e, i) => ({ episode: e, url: urls[i] }))
        };
      })
      .catch(err => {
        console.log('srzPromises catch', err);
      }) // end of fetch
    } else if (srzUrl.url.match(/.+soulreaperzone.+/)) {
      return fetch(srzUrl.url)
      .then(resp => resp.text())
      .then(body => {
        // get last updated date
        const dateRgx = /datetime=.+?>/;
        let dateMatch = body.match(dateRgx);
        let lastUpdated = 'failed to find date';
        if (dateMatch) {
          dateMatch = dateMatch[0];
          lastUpdated = new Date(dateMatch.slice('datetime='.length, -1)); // -1 for last >
        } else {
          console.log('failed to match date, request body:', body);
        }

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
        if (!match || srzUrl.useH264) {
          const h264Rgx = /Episode \d+ .*link="external"/g;
          match = body.match(h264Rgx);
          if (srzUrl.useH264 && match[0].match(hevcRgx)) { // the h264Rgx will also include hevc links, so need to remove
            match[0] = match[0].substring(0, match[0].search('Download HEVC'));
          }
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
        const urls = textBlock.match(/http.+?(?=[ "])/g); // ["http://ouo.press/asdf"]
        return {
          isHevc: isHevc,
          lastUpdated: lastUpdated,
          eps: episodes.map((e, i) => ({ episode: e, url: urls[i] }))
        };
      })
      .catch(err => {
        console.log('srzPromises catch', err);
      }) // end of fetch
    } else {
      console.log(`srzUrl.url doesnt contain anime2enjoy or soulreaperzone: ${srzUrl.url}`)
    }
  }); // end of srzPromises
  let srzCombined = Promise.all(srzPromises)
  .then(results => ({
    animes: results.map((e, i) => ({
      anime: srzUrls[i].anime,
      url: srzUrls[i].url,
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
  let otherlinkstxtFetch = fetch(otherlinkstxtGdrive, fetchOpts).then(resp => resp.text()).catch(err => '');
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
    if (mcResolved.toString().toLowerCase().includes('error')) {
      console.error('mcResolved error', mcResolved);
      return res.status(500).send(
        mcResolved.stack
          .replace(/[\u00A0-\u9999<>\&]/gim, i => '&#'+i.charCodeAt(0)+';') // encode html entities (< = &#60; and > = &#62;)
          .replace(/ /g, '&nbsp;') // encode space char html entity
          .replace(/\n/g, '<br>') // replace new line with html line break
      );
    }
    if (mcResolved) {
      console.log('mcResolved: ', mcResolved);
      const path = await downloadFile(mcResolved)
        .catch(err => res.status(500).send(err));
      console.log('path: ', path);
      res.download(__dirname + path);
    }
  } else if (url.match(/(https?:\/\/www.mediafire.com\/file\/.+)/g)) {
    let mediafireDlUrl = await mediafire(url);
    res.redirect(mediafireDlUrl);
  } else if (url.match(/(https?:\/\/www.*.zippyshare.com\/.+)/g)) {
    let zippyshareDlUrl = await zp(url);
    const path = await downloadFile(zippyshareDlUrl)
      .catch(err => res.status(500).send(err));
    console.log('path: ', path);
    res.download(__dirname + path);
  } else {
    res.sendStatus(400);
  }
});
port = process.env.PORT || 8080;
app.listen(port);
console.log('express server running: http://localhost:' + port);

// download file locally first then offer the downloaded file as response
// to be used for zippyshare where redirecting the dl url doesn't work, probably cos the dlurl is only valid for the IP address that requested it first
async function downloadFile(url) {
  const dir = '/store/zp downloads/';
  const path = await fetch(url)
  .then(res => {
    // eg content-disposition: attachment; filename*=UTF-8''%5bAnimE2Enjoy.Com%5d%20BFox%20-%20%28M%29%20%5bHS-S2O%5d.a2e
    // after decodeURIComponent: attachment; filename*=UTF-8''[AnimE2Enjoy.Com] BFox - (M) [HS-S2O].a2e
    // after regex match: [AnimE2Enjoy.Com] BFox - (M) [HS-S2O].a2e
    const filename = decodeURIComponent(res.headers.get('content-disposition')).match(/[^']*$/)[0];
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
  return path;
}
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