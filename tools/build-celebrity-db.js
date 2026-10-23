/**
 * Maintainer tool: builds data/celebrities.json from public Wikipedia lead
 * images using the same on-device engine as the site. Only numbers are kept.
 */
import { detectImage, largestFace } from '../js/analysis/landmarker.js';
import { analyzeLandmarks } from '../js/analysis/metrics.js';
import { featureVector } from '../js/analysis/lookalike.js';

const DEFAULT_NAMES = `
Zendaya|f
Margot Robbie|f
Scarlett Johansson|f
Gigi Hadid|f
Bella Hadid|f
Beyoncé|f
Rihanna|f
Priyanka Chopra|f
Deepika Padukone|f
Lupita Nyong'o|f
Emma Watson|f
Anne Hathaway|f
Natalie Portman|f
Jennifer Lawrence|f
Taylor Swift|f
Selena Gomez|f
Ana de Armas|f
Zoë Kravitz|f
Gal Gadot|f
Lisa (rapper)|f
Jennie (singer)|f
Florence Pugh|f
Sydney Sweeney|f
Anya Taylor-Joy|f
Dua Lipa|f
Ariana Grande|f
Angelina Jolie|f
Halle Berry|f
Aishwarya Rai Bachchan|f
Mila Kunis|f
Emma Stone|f
Jenna Ortega|f
Hailee Steinfeld|f
Michelle Yeoh|f
Lucy Liu|f
Viola Davis|f
Kerry Washington|f
Sofía Vergara|f
Shakira|f
Golshifteh Farahani|f
Taraneh Alidoosti|f
Nicole Kidman|f
Cate Blanchett|f
Keira Knightley|f
Charlize Theron|f
Kate Winslet|f
Penélope Cruz|f
Salma Hayek|f
Jennifer Lopez|f
Gemma Chan|f
Song Hye-kyo|f
Jun Ji-hyun|f
Alia Bhatt|f
Naomi Campbell|f
Adriana Lima|f
Kendall Jenner|f
Hailey Bieber|f
Lily Collins|f
Millie Bobby Brown|f
Billie Eilish|f
Olivia Rodrigo|f
Sabrina Carpenter|f
Saoirse Ronan|f
Emilia Clarke|f
Sophie Turner|f
Rosamund Pike|f
Amanda Seyfried|f
Chris Hemsworth|m
Henry Cavill|m
Idris Elba|m
Ryan Gosling|m
Timothée Chalamet|m
Keanu Reeves|m
Dev Patel|m
Michael B. Jordan|m
Brad Pitt|m
Leonardo DiCaprio|m
Tom Holland|m
Harry Styles|m
Jungkook|m
Lee Min-ho|m
Shah Rukh Khan|m
Hrithik Roshan|m
Riz Ahmed|m
Pedro Pascal|m
Oscar Isaac|m
Jason Momoa|m
Denzel Washington|m
Will Smith|m
Daniel Kaluuya|m
Cristiano Ronaldo|m
Lionel Messi|m
Mohamed Salah|m
Robert Pattinson|m
Chris Evans|m
Zac Efron|m
Jacob Elordi|m
Paul Mescal|m
Austin Butler|m
Henry Golding|m
Tom Cruise|m
Jake Gyllenhaal|m
Rami Malek|m
Mahershala Ali|m
John Boyega|m
Kit Harington|m
Ryan Reynolds|m
Hugh Jackman|m
Chris Pratt|m
Chris Pine|m
Tom Hiddleston|m
Benedict Cumberbatch|m
Cillian Murphy|m
Jamie Dornan|m
Zayn Malik|m
Shawn Mendes|m
The Weeknd|m
Bad Bunny|m
Gong Yoo|m
Park Seo-joon|m
Cha Eun-woo|m
Ranveer Singh|m
Ranbir Kapoor|m
Dwayne Johnson|m
David Beckham|m
Kylian Mbappé|m
Lewis Hamilton|m
Shahab Hosseini|m
Navid Mohammadzadeh|m
Mohammad Reza Golzar|m
`.trim();

const $ = (s) => document.querySelector(s);
$('#names').value = DEFAULT_NAMES;

async function leadImage(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=800&redirects=1&format=json&origin=*&titles=${encodeURIComponent(title)}`;
  const data = await (await fetch(url)).json();
  const page = Object.values(data.query?.pages || {})[0];
  return page?.thumbnail?.source || null;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function measureOne(name) {
  const src = await leadImage(name);
  if (!src) return { status: 'no image' };
  const img = await loadImage(src);
  const c = Object.assign(document.createElement('canvas'), { width: img.naturalWidth, height: img.naturalHeight });
  c.getContext('2d').drawImage(img, 0, 0);
  const face = largestFace(await detectImage(c));
  if (!face) return { status: 'no face' };
  const a = analyzeLandmarks(face.landmarks, c.width, c.height);
  const smile = Math.max(face.blendshapes.mouthSmileLeft || 0, face.blendshapes.mouthSmileRight || 0);
  const open = face.blendshapes.jawOpen || 0;
  const info = { yaw: a.pose.yaw, pitch: a.pose.pitch, smile, shape: a.shape.key, analysis: a };
  if (Math.abs(a.pose.yaw) > 13 || Math.abs(a.pose.pitch) > 16) return { ...info, status: 'turned' };
  if (open > 0.25 || smile > 0.75) return { ...info, status: 'expression' };
  return { ...info, status: 'ok' };
}

$('#run').addEventListener('click', async () => {
  const lines = $('#names').value.split('\n').map((l) => l.trim()).filter(Boolean);
  const people = [];
  window.__results = [];
  $('#log').innerHTML = '';
  for (const [i, line] of lines.entries()) {
    const [name, g] = line.split('|').map((s) => s.trim());
    $('#status').textContent = `${i + 1} / ${lines.length}: ${name}`;
    let r;
    try {
      r = await measureOne(name);
    } catch (e) {
      r = { status: `error: ${e.message || e}` };
    }
    window.__results.push({ name, g, ...r });
    if (r.status === 'ok') people.push({ name: name.replace(/\s*\(.*\)$/, ''), g, v: featureVector(r.analysis) });
    const f = (v) => (v == null ? '' : v.toFixed(1));
    $('#log').insertAdjacentHTML(
      'beforeend',
      `<tr><td>${name}</td><td class="${r.status === 'ok' ? 'ok' : 'skip'}">${r.status}</td><td>${f(r.yaw)}</td><td>${f(r.pitch)}</td><td>${f(r.smile)}</td><td>${r.shape || ''}</td></tr>`,
    );
  }
  const out = {
    generated: new Date().toISOString().slice(0, 10),
    source: 'Wikipedia lead images (one per person), measured on-device with MediaPipe Face Landmarker',
    note: 'Proportion ratios only. No images or landmark coordinates are stored. For entertainment.',
    count: people.length,
    people,
  };
  $('#out').value = JSON.stringify(out, null, 1);
  $('#status').textContent = `Done — ${people.length} of ${lines.length} usable.`;
  const btn = $('#download');
  btn.disabled = false;
  btn.onclick = () => {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([$('#out').value], { type: 'application/json' })),
      download: 'celebrities.json',
    });
    a.click();
  };
  window.__db = out;
});
