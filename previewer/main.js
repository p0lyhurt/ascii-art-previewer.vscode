const basicMapping = {
  "0": [255, 255, 255],  	 // white
  "1": [0, 0, 0],  	       // black
  "2": [0, 0, 127],  	 // blue
  "3": [0, 147, 0],  	 // green
  "4": [255, 0, 0],  	 // red
  "5": [128, 0, 0],  	 // brown
  "6": [156, 0, 156],  	 // purple
  "7": [255, 127, 0],  	 // orange
  "8": [255, 255, 0],  	 // yellow
  "9": [0, 252, 0],  	 // light green
  "10": [0, 147, 147],  	 // teal
  "11": [0, 255, 255],  	 // light cyan
  "12": [0, 0, 252],  	   // light blue
  "13": [255, 0, 255],  	 // pink
  "14": [128, 128, 128],  	 // grey
  "15": [192, 192, 192],  	 // light grey
};

const extendedMapping = {
  "16":[71,0,0],
  "17":[71,33,0],
  "18":[71,71,0],
  "19":[50,71,0],
  "20":[0,71,0],
  "21":[0,71,44],
  "22":[0,71,71],
  "23":[0,39,71],
  "24":[0,0,71],
  "25":[46,0,71],
  "26":[71,0,71],
  "27":[71,0,42],
  "28":[116,0,0],
  "29":[116,58,0],
  "30":[116,116,0],
  "31":[81,116,0],
  "32":[0,116,0],"33":[0,116,73],"34":[0,116,116],"35":[0,64,116],"36":[0,0,116],"37":[75,0,116],"38":[116,0,116],"39":[116,0,69],"40":[181,0,0],"41":[181,99,0],
  "42":[181,181,0],
  "43":[125,181,0],
  "44":[0,181,0],"45":[0,181,113],"46":[0,181,181],"47":[0,99,181],"48":[0,0,181],"49":[117,0,181],"50":[181,0,181],"51":[181,0,107],"52":[255,0,0],"53":[255,140,0],"54":[255,255,0],"55":[178,255,0],"56":[0,255,0],"57":[0,255,160],"58":[0,255,255],"59":[0,140,255],"60":[0,0,255],"61":[165,0,255],"62":[255,0,255],"63":[255,0,152],"64":[255,89,89],"65":[255,180,89],"66":[255,255,113],"67":[207,255,96],"68":[111,255,111],"69":[101,255,201],"70":[109,255,255],"71":[89,180,255],"72":[89,89,255],"73":[196,89,255],"74":[255,102,255],"75":[255,89,188],"76":[255,156,156],"77":[255,211,156],"78":[255,255,156],"79":[226,255,156],"80":[156,255,156],"81":[156,255,219],"82":[156,255,255],"83":[156,211,255],"84":[156,156,255],"85":[220,156,255],"86":[255,156,255],"87":[255,148,211],
  "89":[19,19,19],"90":[40,40,40],"91":[54,54,54],"92":[77,77,77],"93":[101,101,101],"94":[129,129,129],"95":[159,159,159],"96":[188,188,188],"97":[226,226,226]
};

const fullMapping = Object.assign({}, basicMapping, extendedMapping);

const parsingRegex = /\x03([0-9]{1,2}),([0-9]{1,2})([^\x03\r]+)/g;

function rgb2css([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}

function parseASCIIArt(ascii, onSpan, afterLine = () => {}) {
  for (const line of ascii.split("\n").filter((line) => !!line)) {
    var matchedLine = line.match(parsingRegex);
    if (matchedLine === null) { return; }

    for (const span of matchedLine) {
      const [, textColor, bgColor, text] = span.split(parsingRegex);
      onSpan(text, fullMapping[textColor], fullMapping[bgColor]);
    }
    afterLine();
  }

  return true;
}

function getASCIIArtDimensions(ascii) {
  var lines = ascii.split("\n").filter((line) => !!line),
      height = lines.length,
      width = lines[0].match(parsingRegex).reduce((acc, str) => acc + str.split(parsingRegex)[3].length, 0);

  return [width, height];
}

function addFontFixerElement() {
  const fixer = document.createElement('ascii-art-converter-font-fixer');
  fixer.innerHTML = 'regular';
  document.body.appendChild(fixer);
}

const vscode = acquireVsCodeApi();

class AsciiArtImageConverter {
  constructor() {}

  convert(ascii, {scale, backgroundColor, characterMode, filename}) {
    var [asciiWidth, asciiHeight] = getASCIIArtDimensions(ascii);

    var canvas = document.createElement('canvas');
    canvas.width = asciiWidth*scale;
    canvas.height = asciiHeight*2*scale;

    var ctx = canvas.getContext('2d');
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${this.fontSize(characterMode, scale)}px/normal MxPlus IBM BIOS-2y, AsciiArtConverterFace`;
    ctx.textBaseline = "middle";

    var lineIdx = 0, charIdx = 0;
    parseASCIIArt(ascii, (text, textColor, bgColor) => {
      var y = lineIdx * scale, x = charIdx * scale;

      ctx.fillStyle = rgb2css(bgColor);
      ctx.fillRect(x, y, text.length*scale, 2*scale);

      ctx.fillStyle = rgb2css(textColor);
      for (var i = 0; i < text.length; i++) {
        let char = text.charAt(i);
        if (char === "▄")
          ctx.fillRect(x + i*scale, y + scale, scale, scale);
        else
          ctx.fillText(char, x + i*scale + this.fillTextOffset(characterMode, scale), y + scale);
      }

      charIdx += text.length;
    }, () => {
      lineIdx += 2;
      charIdx = 0;
    });

    var dataURL = canvas.toDataURL(),
        base64 = dataURL.replace('data:image/png;base64,', '');

    vscode.postMessage({command: "writeFile", base64: base64, filename: filename});
  }

  fillTextOffset(mode, scale) {
    switch (mode) {
      case "full":
        return 0;
      case "minus-half":
        return Math.round(scale/8);
    }
  }

  fontSize(mode, scale) {
    switch (mode) {
      case "full":
        return scale*2;
      case "minus-half":
        return scale*2 - scale/2;
    }
  }
};

function getValue(form, name) {
  return form.elements[name].value;
}

function getNumber(form, name) {
  return form.elements[name].valueAsNumber;
}

addFontFixerElement();

document.getElementById("ascii-convert-button").addEventListener("click", (e) => {
  const converter = new AsciiArtImageConverter();

  const form = document.forms["ascii-conversion-form"];

  const scale = getNumber(form, "scale"),
        bgColor = getValue(form, "bgcolor"),
        charmode = getValue(form, "charmode"),
        filename = `${getValue(form, "dest-folder")}/${getValue(form, "dest-file")}.png`;

  converter.convert(window.CURRENT_ASCII, {
    scale: scale,
    backgroundColor: bgColor,
    characterMode: charmode,
    filename: filename
  });
});
