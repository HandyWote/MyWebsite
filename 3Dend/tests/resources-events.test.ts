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
    default: class MockApplication {
        loading = {
            trigger: jest.fn(),
        };
    },
}));

jest.mock('../src/Application/Utils/Loading', () => ({
    default: class MockLoading {
        trigger = jest.fn();
        application = { loading: { trigger: jest.fn() } };
    },
}));

import Resources from '../src/Application/Utils/Resources';

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
