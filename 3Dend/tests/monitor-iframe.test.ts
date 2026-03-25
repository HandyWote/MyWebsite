import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

describe('Monitor iframe source', () => {
  test('uses same-origin /app/ path by default', () => {
    const source = readFileSync(
      join(root, 'src/Application/World/MonitorScreen.ts'),
      'utf8'
    );

    expect(source).toContain("iframe.src = '/app/';");
  });
});
