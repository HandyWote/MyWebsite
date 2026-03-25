import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

const read = (relPath: string) => readFileSync(join(root, relPath), 'utf8');

describe('Feature Removal Regression', () => {
  test('targeted feature directories/files are removed', () => {
    const removedPaths = [
      'src/Application/Shaders/screen',
      'src/Application/Audio',
      'src/Application/UI/components/LoadingScreen.tsx',
      'src/Application/UI/components/HelpPrompt.tsx',
      'src/Application/UI/components/InfoOverlay.tsx',
      'src/Application/UI/components/MuteToggle.tsx',
      'src/Application/UI/components/FreeCamToggle.tsx',
      'server',
    ];

    for (const relPath of removedPaths) {
      expect(existsSync(join(root, relPath))).toBe(false);
    }
  });

  test('audio resources are removed from sources manifest', () => {
    const sources = read('src/Application/sources.ts');
    expect(sources).not.toContain("type: 'audio'");
    expect(sources).not.toContain('audio/');
  });

  test('renderer no longer imports screen shader noise', () => {
    const renderer = read('src/Application/Renderer.ts');
    expect(renderer).not.toContain("./Shaders/screen/vertex.glsl");
    expect(renderer).not.toContain("./Shaders/screen/fragment.glsl");
  });

  test('world no longer references audio manager', () => {
    const world = read('src/Application/World/World.ts');
    expect(world).not.toContain('AudioManager');
    expect(world).not.toContain('audioManager');
  });
});
