// template.service.ts
import * as fs from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import mjml2html from 'mjml';

@Injectable()
export class TemplateService {
  private templatesDir = path.join(process.cwd(), '..', 'templates');

  render(templateName: string, data: Record<string, any>): string {
    const filePath = path.join(this.templatesDir, `${templateName}.mjml`);
    const mjmlSource = fs.readFileSync(filePath, 'utf8');

    let compiledMjml = mjmlSource.replace(/{{(\w+)}}/g, (_, key) => data[key] || '');

    const { html, errors } = mjml2html(compiledMjml);

    if (errors.length) {
      console.error('MJML errors:', errors);
    }

    return html;
  }
}
