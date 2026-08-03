import { describe, test, expect } from '@jest/globals';
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

  test('bridges wheel events from the iframe document to its scroll container', () => {
    // 滚轮桥接已拆分为 WheelBridge 模块（MonitorScreen 只负责装配）
    const source = readFileSync(
      join(root, 'src/Application/World/WheelBridge.ts'),
      'utf8'
    );

    expect(source).toContain("doc.addEventListener('wheel', handleWheel, { passive: false });");
    expect(source).toContain('this.findScrollTarget(event, doc)');
    expect(source).toContain('element.scrollHeight > element.clientHeight');
    expect(source).toContain("doc.querySelector('main')");
    expect(source).toContain("doc.body?.querySelectorAll('*')");
    expect(source).toContain('cachedIframeScrollTarget');
    expect(source).toContain('if (deltaX === 0 && deltaY === 0) return;');
  });

  test('MonitorScreen wires the wheel bridge on iframe load', () => {
    const source = readFileSync(
      join(root, 'src/Application/World/MonitorScreen.ts'),
      'utf8'
    );

    expect(source).toContain('this.wheelBridge.attach(iframe);');
  });
});
