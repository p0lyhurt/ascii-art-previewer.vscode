import { fullMapping } from "./constants";

const parsingRegex = /\x03([0-9]{1,2}),([0-9]{1,2})([^\x03\r]+)/g;

export function rgb2css([r, g, b]: Number[]) {
  return `rgb(${r}, ${g}, ${b})`;
};

export function parseASCIIArt(ascii: string, onSpan: (text: string, textCol: Number[], bgCol: Number[]) => void, afterLine = () => {}) {
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
};
