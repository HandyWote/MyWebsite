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

  test('iframe is created up front and revealed after geometry ready', () => {
    const worldSource = readFileSync(
      join(root, 'src/Application/World/World.ts'),
      'utf8'
    );
    const screenSource = readFileSync(
      join(root, 'src/Application/World/MonitorScreen.ts'),
      'utf8'
    );

    // iframe 与 3D 模型资源并行加载：构造时创建屏幕（隐藏），geometryReady 后显示
    expect(worldSource).toContain('this.monitorScreen = new MonitorScreen();');
    expect(worldSource).toContain('this.monitorScreen.setVisible(false);');
    expect(worldSource).toContain('this.monitorScreen.setVisible(true);');
    expect(screenSource).toContain("this.iframeContainer.style.opacity = visible ? '1' : '0';");
  });

  test('MonitorScreen wires the wheel bridge on iframe load', () => {
    const source = readFileSync(
      join(root, 'src/Application/World/MonitorScreen.ts'),
      'utf8'
    );

    expect(source).toContain('this.wheelBridge.attach(iframe);');
  });
});
