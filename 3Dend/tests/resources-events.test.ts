/**
 * Resources 两阶段加载事件测试
 */

// Mock THREE before any imports
jest.mock('three', () => ({
    TextureLoader: jest.fn().mockImplementation(() => ({
        load: jest.fn((_url, onLoad) => {
            // Use process.nextTick to simulate async loading behavior
            // so events fire after constructor returns
            process.nextTick(() => onLoad({ encoding: 0 }));
        }),
    })),
    CubeTextureLoader: jest.fn().mockImplementation(() => ({
        load: jest.fn((_urls, onLoad) => {
            process.nextTick(() => onLoad({}));
        }),
    })),
    sRGBEncoding: 3001,
}));

jest.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
    GLTFLoader: jest.fn().mockImplementation(() => ({
        load: jest.fn((_url, onLoad) => {
            process.nextTick(() => onLoad({ scene: { traverse: jest.fn() } }));
        }),
    })),
}));

// Mock Application to break singleton cycle
jest.mock('../src/Application/Application', () => ({
    __esModule: true,
    default: class MockApplication {},
}));

import Resources from '../src/Application/Utils/Resources';

type Resource = ConstructorParameters<typeof Resources>[0][number];

describe('Resources two-phase events', () => {
    test('在所有 geometry 资源加载完后触发 geometryReady', (done) => {
        const onGeometryReady = jest.fn();
        const sources: Resource[] = [
            { name: 'model1', type: 'gltfModel' as const, path: 'a.glb', group: 'geometry' as const },
            { name: 'model2', type: 'gltfModel' as const, path: 'b.glb', group: 'geometry' as const },
            { name: 'tex1', type: 'texture' as const, path: 'a.webp', group: 'texture' as const },
        ];
        const res = new Resources(sources);
        res.on('geometryReady', onGeometryReady);

        // Wait for async mock loaders to complete
        setTimeout(() => {
            expect(onGeometryReady).toHaveBeenCalledTimes(1);
            done();
        }, 50);
    });

    test('在每个 texture 资源加载完后触发 textureLoaded 事件', (done) => {
        const onTextureLoaded = jest.fn();
        const sources: Resource[] = [
            { name: 'model1', type: 'gltfModel' as const, path: 'a.glb', group: 'geometry' as const },
            { name: 'tex1', type: 'texture' as const, path: 'a.webp', group: 'texture' as const },
            { name: 'tex2', type: 'texture' as const, path: 'b.webp', group: 'texture' as const },
        ];
        const res = new Resources(sources);
        res.on('textureLoaded', onTextureLoaded);

        setTimeout(() => {
            expect(onTextureLoaded).toHaveBeenCalledTimes(2);
            expect(onTextureLoaded).toHaveBeenCalledWith('tex1', expect.any(Object));
            expect(onTextureLoaded).toHaveBeenCalledWith('tex2', expect.any(Object));
            done();
        }, 50);
    });

    test('在全部资源加载完后仍触发 ready 事件', (done) => {
        const onAllReady = jest.fn();
        const sources: Resource[] = [
            { name: 'model1', type: 'gltfModel' as const, path: 'a.glb', group: 'geometry' as const },
            { name: 'tex1', type: 'texture' as const, path: 'a.webp', group: 'texture' as const },
        ];
        const res = new Resources(sources);
        res.on('ready', onAllReady);

        setTimeout(() => {
            expect(onAllReady).toHaveBeenCalledTimes(1);
            done();
        }, 50);
    });
});

// ============================================================
// 纹理缓冲机制测试（竞态条件修复）
// ============================================================

describe('Resources texture buffering（竞态条件修复）', () => {
    /**
     * 通过 jest.requireMock 临时覆盖 loader mock，将 onLoad 回调收集到数组中，
     * 测试可以手动调用这些回调来精确控制加载顺序。
     */

    test('纹理在 geometryReady 之前加载时被缓冲，不立即触发 textureLoaded', () => {
        const gltfCallbacks: Array<(file: any) => void> = [];
        const texCallbacks: Array<(file: any) => void> = [];

        // 临时覆盖 THREE mock
        const { TextureLoader } = jest.requireMock('three');
        TextureLoader.mockImplementation(() => ({
            load: jest.fn((_url, onLoad) => {
                texCallbacks.push(onLoad);
            }),
        }));
        const { GLTFLoader } = jest.requireMock('three/examples/jsm/loaders/GLTFLoader.js');
        GLTFLoader.mockImplementation(() => ({
            load: jest.fn((_url, onLoad) => {
                gltfCallbacks.push(onLoad);
            }),
        }));

        const sources: Resource[] = [
            { name: 'model1', type: 'gltfModel' as const, path: 'a.glb', group: 'geometry' as const },
            { name: 'tex1', type: 'texture' as const, path: 'a.webp', group: 'texture' as const },
        ];
        const res = new Resources(sources);

        const onTextureLoaded = jest.fn();
        const onGeometryReady = jest.fn();
        res.on('textureLoaded', onTextureLoaded);
        res.on('geometryReady', onGeometryReady);

        // 纹理先加载完成
        texCallbacks[0]({ encoding: 0 });

        // 断言：textureLoaded 尚未触发（被缓冲了）
        expect(onTextureLoaded).not.toHaveBeenCalled();
        expect(onGeometryReady).not.toHaveBeenCalled();

        // geometry 加载完成
        gltfCallbacks[0]({ scene: { traverse: jest.fn() } });

        // 断言：geometryReady 触发后，缓冲的纹理事件被释放
        expect(onGeometryReady).toHaveBeenCalledTimes(1);
        expect(onTextureLoaded).toHaveBeenCalledTimes(1);
        expect(onTextureLoaded).toHaveBeenCalledWith('tex1', expect.any(Object));
    });

    test('geometryReady 触发后，缓冲的纹理按原始加载顺序释放', () => {
        const gltfCallbacks: Array<(file: any) => void> = [];
        const texCallbacks: Array<(file: any) => void> = [];

        const { TextureLoader } = jest.requireMock('three');
        TextureLoader.mockImplementation(() => ({
            load: jest.fn((_url, onLoad) => {
                texCallbacks.push(onLoad);
            }),
        }));
        const { GLTFLoader } = jest.requireMock('three/examples/jsm/loaders/GLTFLoader.js');
        GLTFLoader.mockImplementation(() => ({
            load: jest.fn((_url, onLoad) => {
                gltfCallbacks.push(onLoad);
            }),
        }));

        const sources: Resource[] = [
            { name: 'model1', type: 'gltfModel' as const, path: 'a.glb', group: 'geometry' as const },
            { name: 'tex1', type: 'texture' as const, path: 'a.webp', group: 'texture' as const },
            { name: 'tex2', type: 'texture' as const, path: 'b.webp', group: 'texture' as const },
            { name: 'tex3', type: 'texture' as const, path: 'c.webp', group: 'texture' as const },
        ];
        const res = new Resources(sources);

        const textureOrder: string[] = [];
        res.on('textureLoaded', (_name: string) => {
            textureOrder.push(_name);
        });
        res.on('geometryReady', jest.fn());

        // tex2 先加载，然后 tex1，然后 tex3（乱序）
        texCallbacks[1]({ encoding: 0 }); // tex2
        texCallbacks[0]({ encoding: 0 }); // tex1
        texCallbacks[2]({ encoding: 0 }); // tex3

        // 此时没有任何 textureLoaded 触发
        expect(textureOrder).toEqual([]);

        // geometry 加载完成
        gltfCallbacks[0]({ scene: { traverse: jest.fn() } });

        // 缓冲的纹理应按原始加载顺序释放：tex2, tex1, tex3
        expect(textureOrder).toEqual(['tex2', 'tex1', 'tex3']);
    });

    test('geometryReady 之后加载的纹理立即触发 textureLoaded', () => {
        const gltfCallbacks: Array<(file: any) => void> = [];
        const texCallbacks: Array<(file: any) => void> = [];

        const { TextureLoader } = jest.requireMock('three');
        TextureLoader.mockImplementation(() => ({
            load: jest.fn((_url, onLoad) => {
                texCallbacks.push(onLoad);
            }),
        }));
        const { GLTFLoader } = jest.requireMock('three/examples/jsm/loaders/GLTFLoader.js');
        GLTFLoader.mockImplementation(() => ({
            load: jest.fn((_url, onLoad) => {
                gltfCallbacks.push(onLoad);
            }),
        }));

        const sources: Resource[] = [
            { name: 'model1', type: 'gltfModel' as const, path: 'a.glb', group: 'geometry' as const },
            { name: 'tex1', type: 'texture' as const, path: 'a.webp', group: 'texture' as const },
        ];
        const res = new Resources(sources);

        const onTextureLoaded = jest.fn();
        const onGeometryReady = jest.fn();
        res.on('textureLoaded', onTextureLoaded);
        res.on('geometryReady', onGeometryReady);

        // geometry 先加载完成
        gltfCallbacks[0]({ scene: { traverse: jest.fn() } });

        expect(onGeometryReady).toHaveBeenCalledTimes(1);
        // 此时还没有纹理加载
        expect(onTextureLoaded).not.toHaveBeenCalled();

        // 纹理在 geometryReady 之后加载 → 应立即触发
        texCallbacks[0]({ encoding: 0 });

        expect(onTextureLoaded).toHaveBeenCalledTimes(1);
        expect(onTextureLoaded).toHaveBeenCalledWith('tex1', expect.any(Object));
    });

    test('同时有缓冲纹理和新纹理时的混合行为', () => {
        const gltfCallbacks: Array<(file: any) => void> = [];
        const texCallbacks: Array<(file: any) => void> = [];

        const { TextureLoader } = jest.requireMock('three');
        TextureLoader.mockImplementation(() => ({
            load: jest.fn((_url, onLoad) => {
                texCallbacks.push(onLoad);
            }),
        }));
        const { GLTFLoader } = jest.requireMock('three/examples/jsm/loaders/GLTFLoader.js');
        GLTFLoader.mockImplementation(() => ({
            load: jest.fn((_url, onLoad) => {
                gltfCallbacks.push(onLoad);
            }),
        }));

        const sources: Resource[] = [
            { name: 'model1', type: 'gltfModel' as const, path: 'a.glb', group: 'geometry' as const },
            { name: 'tex1', type: 'texture' as const, path: 'a.webp', group: 'texture' as const },
            { name: 'tex2', type: 'texture' as const, path: 'b.webp', group: 'texture' as const },
            { name: 'tex3', type: 'texture' as const, path: 'c.webp', group: 'texture' as const },
            { name: 'tex4', type: 'texture' as const, path: 'd.webp', group: 'texture' as const },
        ];
        const res = new Resources(sources);

        const textureOrder: string[] = [];
        res.on('textureLoaded', (_name: string) => {
            textureOrder.push(_name);
        });
        res.on('geometryReady', jest.fn());

        // tex1 和 tex3 在 geometryReady 前加载（被缓冲）
        texCallbacks[0]({ encoding: 0 }); // tex1 → 缓冲
        texCallbacks[2]({ encoding: 0 }); // tex3 → 缓冲

        expect(textureOrder).toEqual([]);

        // geometry 加载完成 → 释放缓冲的 tex1, tex3
        gltfCallbacks[0]({ scene: { traverse: jest.fn() } });

        expect(textureOrder).toEqual(['tex1', 'tex3']);

        // tex2 和 tex4 在 geometryReady 后加载 → 立即触发
        texCallbacks[1]({ encoding: 0 }); // tex2 → 立即
        texCallbacks[3]({ encoding: 0 }); // tex4 → 立即

        // 所有纹理都正确触发
        expect(textureOrder).toEqual(['tex1', 'tex3', 'tex2', 'tex4']);
    });
});
