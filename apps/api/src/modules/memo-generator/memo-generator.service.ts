import { Injectable, Logger } from '@nestjs/common';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { BoardMemberDto, GenerateMemoDto } from './dto/generate-memo.dto';

@Injectable()
export class MemoGeneratorService {
  private readonly logger = new Logger(MemoGeneratorService.name);
  private readonly outputDir = process.env.MEMO_STORAGE_DIR
    ? path.resolve(process.env.MEMO_STORAGE_DIR)
    : path.resolve(__dirname, '../../../public/generated_memos');
  private readonly logoPath = path.resolve(__dirname, '../../../assets/nsa_logo.png');
  private readonly defaultBoard: BoardMemberDto[] = [];

  constructor() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      this.logger.log(`Created output directory: ${this.outputDir}`);
    }
  }

  async generateMemo(data: GenerateMemoDto): Promise<string> {
    try {
      const boardMembers = data.boardMembers || this.defaultBoard;
      const doc = this.createDocument(data, boardMembers);
      const filename = `NORED_Memo_${Date.now()}.docx`;
      const filepath = path.join(this.outputDir, filename);

      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(filepath, buffer);

      this.logger.log(`Generated memo: ${filename}`);
      return filename;
    } catch (error) {
      this.logger.error('Error generating memo:', error);
      throw error;
    }
  }

  private createDocument(data: GenerateMemoDto, boardMembers: BoardMemberDto[]): Document {
    return new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720,
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          headers: {
            default: this.createHeader(),
          },
          footers: {
            default: this.createFooter(boardMembers),
          },
          children: [
            ...this.createRoutingSection(data),
            new Paragraph({ text: '' }),
            ...this.createPurposeSection(data.purpose),
            new Paragraph({ text: '' }),
            ...this.createFinancialSection(data.financialImplication),
            new Paragraph({ text: '' }),
            ...this.createRecommendationSection(data.recommendation),
          ],
        },
      ],
    });
  }

  private createHeader(): Header {
    const hasLogo = fs.existsSync(this.logoPath);

    const logoCell = hasLogo
      ? new TableCell({
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  type: 'png',
                  data: fs.readFileSync(this.logoPath),
                  transformation: {
                    width: 80,
                    height: 80,
                  },
                }),
              ],
              alignment: AlignmentType.LEFT,
            }),
          ],
          width: { size: 3000, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          },
        })
      : new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'NORED',
                  bold: true,
                  size: 20,
                  color: 'B91C1C',
                }),
              ],
              alignment: AlignmentType.LEFT,
            }),
          ],
          width: { size: 3000, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          },
        });

    const addressCell = new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: 'Northern Regional Electricity Distributor',
              size: 18,
            }),
          ],
          alignment: AlignmentType.LEFT,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Electricity For Development',
              size: 18,
            }),
          ],
          alignment: AlignmentType.LEFT,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'NAMIBIA',
              size: 18,
            }),
          ],
          alignment: AlignmentType.LEFT,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Internal Memorandum',
              size: 18,
            }),
          ],
          alignment: AlignmentType.LEFT,
        }),
      ],
      width: { size: 6360, type: WidthType.DXA },
      verticalAlign: VerticalAlign.TOP,
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
      },
    });

    return new Header({
      children: [
        new Table({
          rows: [
            new TableRow({
              children: [logoCell, addressCell],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: 'B91C1C' },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
        }),
        new Paragraph({ text: '' }),
      ],
    });
  }

  private createFooter(boardMembers: BoardMemberDto[]): Footer {
    const footerText =
      boardMembers.length > 0
        ? boardMembers.map((member) => `${member.name} (${member.title})`).join(', ')
        : 'Northern Regional Electricity Distributor - Electricity For Development';

    return new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: '-'.repeat(80),
              color: 'B91C1C',
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'NORED',
              bold: true,
              size: 18,
              color: 'B91C1C',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: footerText,
              size: 16,
              color: '4B5563',
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    });
  }

  private createRoutingSection(data: GenerateMemoDto): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        children: [
          new TextRun({ text: 'TO: ', bold: true }),
          new TextRun({ text: data.to }),
        ],
        spacing: { after: 100 },
      }),
    ];

    if (data.through) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'THROUGH: ', bold: true }),
            new TextRun({ text: `${data.through.name}, ${data.through.position}` }),
          ],
          spacing: { after: 100 },
        }),
      );
    }

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'FROM: ', bold: true }),
          new TextRun({ text: `${data.fromName}, ${data.fromTitle}` }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'DATE: ', bold: true }),
          new TextRun({ text: data.date }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'SUBJECT: ', bold: true }),
          new TextRun({ text: data.subject.toUpperCase() }),
        ],
        spacing: { after: 200 },
      }),
    );

    return paragraphs;
  }

  private createPurposeSection(purpose: string): Paragraph[] {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: '1. PURPOSE',
            bold: true,
            size: 22,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        text: purpose,
        spacing: { after: 200 },
      }),
    ];
  }

  private createFinancialSection(financial?: string): Paragraph[] {
    if (!financial) return [];

    return [
      new Paragraph({
        children: [
          new TextRun({
            text: '2. FINANCIAL IMPLICATION',
            bold: true,
            size: 22,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        text: financial,
        spacing: { after: 200 },
      }),
    ];
  }

  private createRecommendationSection(recommendation: string): Paragraph[] {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: '3. RECOMMENDATION',
            bold: true,
            size: 22,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        text: recommendation,
        spacing: { after: 200 },
      }),
    ];
  }

  getBoardMembers(): BoardMemberDto[] {
    return this.defaultBoard;
  }
}
