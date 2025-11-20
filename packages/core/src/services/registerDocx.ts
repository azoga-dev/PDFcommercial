import * as path from 'path';
import { promises as fsp } from 'fs';
import {
  Document,
  Packer,
  WidthType,
  VerticalAlign,
  Table,
  TableCell,
  TableRow,
  Paragraph,
  TextRun,
  AlignmentType,
} from 'docx';

/** 1 см = 567 twips. */
const cmToTwip = (cm: number) => Math.round(cm * 567);

const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n);

const formatDateTime = (d: Date) =>
  `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const formatDate = (d: Date) =>
  `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;

/**
 * Создаёт .docx реестр файлов и сохраняет его в outputFolder.
 * files — массив имён файлов (basename или относительный путь).
 * Возвращает абсолютный путь созданного файла.
 */
export async function createRegisterDocx(outputFolder: string, files: string[]): Promise<string> {
  const names = files.map((f) => {
    const b = path.basename(f);
    const idx = b.lastIndexOf('.');
    return idx > 0 ? b.slice(0, idx) : b;
  });

  const children: any[] = [];

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Реестр переданных файлов посредством выгрузки на Лукойл-диск',
          bold: true,
          size: 28,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
    })
  );

  children.push(new Paragraph({ text: '' }));

  const headerRow = new TableRow({
    children: [
      new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        width: { size: cmToTwip(1.0), type: WidthType.DXA },
        children: [
          new Paragraph({
            children: [new TextRun({ text: '№', bold: true, size: 24 })],
            alignment: AlignmentType.CENTER,
          }),
        ],
      }),
      new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        width: { size: cmToTwip(17.0), type: WidthType.DXA },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Наименование файла', bold: true, size: 24 })],
            alignment: AlignmentType.CENTER,
          }),
        ],
      }),
    ],
  });

  const dataRows = names.map((nm, i) => {
    return new TableRow({
      children: [
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          width: { size: cmToTwip(1.0), type: WidthType.DXA },
          children: [
            new Paragraph({
              children: [new TextRun({ text: String(i + 1), size: 24 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          width: { size: cmToTwip(17.0), type: WidthType.DXA },
          children: [
            new Paragraph({
              children: [new TextRun({ text: nm, size: 24 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      ],
    });
  });

  const table = new Table({
    rows: [headerRow, ...dataRows],
    width: { size: cmToTwip(19.0), type: WidthType.DXA },
  });

  children.push(table);
  children.push(new Paragraph({ text: '' }));

  const now = new Date();
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Дата формирования реестра: ', bold: true, size: 24 }),
        new TextRun({ text: formatDateTime(now), size: 24 }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: cmToTwip(1),
              bottom: cmToTwip(1),
              left: cmToTwip(1),
              right: cmToTwip(1),
            },
          },
        },
        children,
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 24,
            color: '000000',
          },
        },
      },
    },
  });

  const safeDate = formatDate(now);
  const filename = `Реестр от ${safeDate}.docx`;
  const outPath = path.join(outputFolder, filename);
  const buffer = await Packer.toBuffer(doc);
  await fsp.writeFile(outPath, buffer);
  return outPath;
}