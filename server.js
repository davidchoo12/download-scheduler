const express = require('express');
const request = require('request');
const fetch = require('node-fetch');

const app = express();

app.get('/links', (req, res) => {
  console.log('reached /links, req.originalUrl: ', req.originalUrl);
  let srzUrls = [
    {anime: 'Boku no Hero Academia 3', url: 'https://www.soulreaperzone.com/anime/boku-no-hero-academia-3rd-season/'},
    {anime: 'Steins Gate 0', url: 'https://www.soulreaperzone.com/anime/steins-gate-zero/'},
    {anime: 'Overlord III', url: 'https://www.soulreaperzone.com/anime/overlord-III'},
    {anime: 'Hataraku Saibou', url: 'https://www.soulreaperzone.com/anime/hataraku-saibou-tv/'},
    {anime: 'Angels of Death', url: 'https://www.soulreaperzone.com/anime/angels-of-death'},
    {anime: 'Grand Blue', url: 'https://www.soulreaperzone.com/anime/grand-blue'},
    {anime: 'Gintama Shirogane no Tamashii hen 2', url: 'https://www.soulreaperzone.com/anime/gintama-shirogane-no-tamashii-hen-2/'},
  ];
  let srzPromises = srzUrls.map(srzUrl =>
    fetch(srzUrl.url)
    .then(resp => resp.text())
    .then(body => {
      // lookbehind (?<=...) not yet supported in node v8.9.4
      // const r = /(?<=Download HEVC.*)(Episode \d+).+?(http:\/\/.*?)(?=" target="_blank" rel="nofollow" class="external">720p HEVC)/g;
      // let match, episodes, urls;
      // while (match = r.exec(body)) {
      //   episodes.push(match[1]);
      //   urls.push(match[2]);
      // }
      // because lookbehind not supported, find the block of text, then find again inside the block
      const hevcRgx = /(?:Download HEVC.*).*(?=720p HEVC)/g;
      let match = body.match(hevcRgx);
      let isHevc = true;
      if (!match) {
        const h264Rgx = /Episode \d+ .*http.+?(?=class="external")/g;
        match = body.match(h264Rgx);
        isHevc = false;
      }
      const textBlock = match[0];
      const episodes = textBlock.match(/Episode \d+/g); // ["Episode 01"]
      const urls = textBlock.match(/http.+?(?=")/g); // ["http://ouo.press/asdf"]
      return {
        isHevc: isHevc,
        eps: episodes.map((e, i) => ({ episode: e, url: urls[i] }))
      };
    })
    .catch(err => {
      console.log(err);
    })// end of fetch
  ); // end of srzPromises
  let srzCombined = Promise.all(srzPromises)
  .then(results => ({
    animes: results.map((e, i) => ({
      anime: srzUrls[i].anime,
      isHevc: e.isHevc,
      episodes: e.eps
    }))
  }));
  let ytUrls = ['https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UCYzPXprvl5Y-Sf0g4vX-m6g&order=date&key=AIzaSyBpu8hgnXbkqFVWrAvwRUEz7T13ii3I7WM', 'https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UC7_YxT-KID8kRbqZo7MyscQ&order=date&key=AIzaSyBpu8hgnXbkqFVWrAvwRUEz7T13ii3I7WM'];
  let ytPromises = ytUrls.map(ytUrl =>
    fetch(ytUrl)
    .then(resp => resp.json())
    .then(body => ({
      channel: body.items[0].snippet.channelTitle,
      videos: body.items.map(e => ({
        id: e.id.videoId,
        title: e.snippet.title
      }))
    })) // end of fetch
  ); // end of ytPromises
  let ytCombined = Promise.all(ytPromises)
  .then(e => ({youtubes: e}));
  Promise.all([srzCombined, ytCombined])
  .then(e => res.send({...e[0], ...e[1]}));
  // fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UCYzPXprvl5Y-Sf0g4vX-m6g&order=date&key=AIzaSyBpu8hgnXbkqFVWrAvwRUEz7T13ii3I7WM')
  // .then(resp => resp.json())
  // .then(body => {
  //   body.items.map(e => {
  //     return { id: e.id.videoId, title: e.snippet.title };
  //   });
  // });
});
// app.get('/', (req, res) => {
//   res.sendFile(__dirname + '/server.html');
// });
app.use('/', express.static(__dirname + '/public'));
app.get('/http*', (req, res) => {
  console.log('reached /http*, req.originalUrl:', req.originalUrl);
  const url = req.url.slice(1);
  if (url.match(/(https:\/\/www.youtube.com\/watch\?v=.+)|(https:\/\/youtu.be\/.+)/g)) {
    const dl = youtube(res, url);
    console.log('yt: ' + url);
    // res.redirect(dl.url);
  } else {
    res.sendStatus(400);
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
        console.log('URL before replace:\n' + json.url);
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