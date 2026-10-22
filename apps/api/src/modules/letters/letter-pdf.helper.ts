import { fileURLToPath } from 'node:url';
import { BsDateHelper, NumeralHelper } from '@ward-sewa/nepal-utils';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { IssuedLetter } from './letters.repository.ts';

const font = (file: string) =>
  fileURLToPath(new URL(`../../../assets/fonts/${file}`, import.meta.url));
const FONTS = {
  deva: font('NotoSansDevanagari-Regular.ttf'),
  devaBold: font('NotoSansDevanagari-Bold.ttf'),
  latin: font('NotoSans-Regular.ttf'),
  latinBold: font('NotoSans-Bold.ttf'),
};
const MARGIN = 60;

interface Run {
  text: string;
  devanagari: boolean;
}

interface LineOptions {
  size?: number;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
}

export class LetterPdfHelper {
  // Devanagari and Latin need different fonts; spaces and punctuation join the current run.
  static runs(text: string): Run[] {
    const runs: Run[] = [];
    for (const char of text) {
      const devanagari = /[ऀ-ॿ‌‍]/.test(char);
      const neutral = /[\s.,:;()/\-–]/.test(char);
      const last = runs.at(-1);
      if (last && (neutral || last.devanagari === devanagari)) last.text += char;
      else runs.push({ text: char, devanagari });
    }
    return runs;
  }

  static async render(letter: IssuedLetter, verifyUrl: string): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, info: { Title: letter.letterNo } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    const { snapshot } = letter;
    const { address } = snapshot;
    const ne = (value: string | number) => NumeralHelper.toNepali(value);
    const date = BsDateHelper.format(BsDateHelper.parse(letter.issuedDateBs), {
      locale: 'ne',
      style: 'long',
    });

    LetterPdfHelper.#line(doc, address.localLevel, { size: 18, bold: true, align: 'center' });
    LetterPdfHelper.#line(doc, `वडा नं. ${ne(address.wardNo)} को कार्यालय`, {
      size: 15,
      bold: true,
      align: 'center',
    });
    LetterPdfHelper.#line(doc, `${address.district}, ${address.province}`, {
      size: 11,
      align: 'center',
    });
    doc.moveDown(0.5);
    doc
      .moveTo(MARGIN, doc.y)
      .lineTo(doc.page.width - MARGIN, doc.y)
      .stroke();
    doc.moveDown(0.8);

    const top = doc.y;
    LetterPdfHelper.#line(doc, `पत्र संख्या: ${ne(letter.fiscalYear)}`);
    LetterPdfHelper.#line(doc, `चलानी नं.: ${ne(letter.serialNo)}`);
    const below = doc.y;
    doc.y = top;
    LetterPdfHelper.#line(doc, `मिति: ${date}`, { align: 'right' });
    doc.y = below;
    doc.moveDown(1);

    LetterPdfHelper.#line(doc, `विषय: ${snapshot.serviceType.nameNe} सम्बन्धमा।`, {
      bold: true,
      align: 'center',
    });
    doc.moveDown(1);

    const house = address.houseNo ? `, घर नं. ${address.houseNo}` : '';
    LetterPdfHelper.#paragraph(
      doc,
      `${address.localLevel} वडा नं. ${ne(address.wardNo)}, ${address.tole}${house} निवासी श्री ${snapshot.applicant.name} ले यस कार्यालयमा पेश गर्नुभएको निवेदन बमोजिम निम्न विवरण प्रमाणित गरी यो सिफारिस गरिएको छ।`,
    );
    doc.moveDown(0.8);

    const fields =
      snapshot.fields ??
      Object.entries(snapshot.formData).map(([key, value]) => ({
        key,
        labelNe: key,
        labelEn: key,
        value,
      }));
    for (const field of fields) {
      LetterPdfHelper.#line(
        doc,
        `${field.labelNe}: ${/^\d{4}-\d{2}-\d{2}$/.test(field.value) ? ne(field.value) : field.value}`,
      );
    }

    const qr = await QRCode.toBuffer(verifyUrl, {
      type: 'png',
      margin: 1,
      width: 300,
      errorCorrectionLevel: 'M',
    });
    const bottom = doc.page.height - MARGIN - 110;
    doc.image(qr, MARGIN, bottom, { width: 100 });
    doc.y = bottom + 10;
    doc.x = MARGIN + 115;
    LetterPdfHelper.#line(doc, 'यो पत्र प्रमाणित गर्न QR कोड स्क्यान गर्नुहोस्:', { size: 10 });
    doc.x = MARGIN + 115;
    LetterPdfHelper.#line(doc, verifyUrl, { size: 9 });
    doc.x = MARGIN + 115;
    LetterPdfHelper.#line(doc, `प्रमाणीकरण कोड: ${letter.verificationCode}`, { size: 10 });

    doc.y = bottom + 45;
    LetterPdfHelper.#line(doc, '........................................', { align: 'right' });
    LetterPdfHelper.#line(doc, 'वडा अध्यक्ष', { bold: true, align: 'right' });

    doc.end();
    return done;
  }

  static #line(doc: PDFKit.PDFDocument, text: string, options: LineOptions = {}) {
    LetterPdfHelper.#flow(doc, text, options);
  }

  static #paragraph(doc: PDFKit.PDFDocument, text: string) {
    LetterPdfHelper.#flow(doc, text, { size: 12 });
  }

  // PDFKit can't wrap mixed fonts on one baseline, so we lay out words ourselves: measure each in
  // its own font, wrap greedily, and draw every run on a shared alphabetic baseline.
  static #flow(
    doc: PDFKit.PDFDocument,
    text: string,
    { size = 12, bold = false, align = 'left' }: LineOptions,
  ) {
    const fontOf = (run: Run) =>
      run.devanagari ? (bold ? FONTS.devaBold : FONTS.deva) : bold ? FONTS.latinBold : FONTS.latin;
    const measure = (run: Run) => doc.font(fontOf(run)).fontSize(size).widthOfString(run.text);
    const space = doc.font(FONTS.latin).fontSize(size).widthOfString(' ');
    const left = doc.x;
    const maxWidth = doc.page.width - MARGIN - left;

    const words = text
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => {
        const runs = LetterPdfHelper.runs(word);
        return { runs, width: runs.reduce((sum, run) => sum + measure(run), 0) };
      });
    const lines: (typeof words)[] = [[]];
    let lineWidth = 0;
    for (const word of words) {
      const current = lines.at(-1) ?? [];
      const needed = current.length === 0 ? word.width : lineWidth + space + word.width;
      if (current.length > 0 && needed > maxWidth) {
        lines.push([word]);
        lineWidth = word.width;
      } else {
        current.push(word);
        lineWidth = needed;
      }
    }

    const lineHeight = size * 1.55;
    for (const line of lines) {
      const width =
        line.reduce((sum, word) => sum + word.width, 0) + space * Math.max(line.length - 1, 0);
      let x = {
        left,
        center: (doc.page.width - width) / 2,
        right: doc.page.width - MARGIN - width,
      }[align];
      const baseline = doc.y + size * 1.2;
      for (const word of line) {
        for (const run of word.runs) {
          doc.font(fontOf(run)).fontSize(size).text(run.text, x, baseline, {
            lineBreak: false,
            baseline: 'alphabetic',
          });
          x += measure(run);
        }
        x += space;
      }
      doc.x = left;
      doc.y += lineHeight;
    }
  }
}
