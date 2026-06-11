/**
 * BakedModel 无纹理构造和延迟贴图测试
 */
describe('BakedModel', () => {
    const createMockModel = () => {
        const meshChild = { isMesh: true, scale: { set: jest.fn() }, material: { map: null, needsUpdate: false } as any };
        return {
            scene: {
                traverse: jest.fn((cb: (child: any) => void) => {
                    cb(meshChild);
                }),
            },
        };
    };

    const createMockTexture = () => ({
        flipY: true,
        encoding: 0,
    });

    test('无纹理构造时使用深灰色占位材质', () => {
        const BakedModel = require('../src/Application/Utils/BakedModel').default;
        const mockModel = createMockModel();

        const baked = new BakedModel(mockModel, undefined, 900);

        expect(baked.getModel()).toBe(mockModel.scene);
        // 验证 traverse 被调用（mesh 子节点被遍历）
        expect(mockModel.scene.traverse).toHaveBeenCalled();
    });

    test('无纹理构造时 material.map 为 null', () => {
        const BakedModel = require('../src/Application/Utils/BakedModel').default;
        const mockModel = createMockModel();

        const baked = new BakedModel(mockModel, undefined, 900);

        // THREE.MeshBasicMaterial 无 map 时默认为 null
        expect(baked.material.map).toBeNull();
        // 占位材质应为深灰色 0x333333
        expect(baked.material.color).toBeDefined();
    });

    test('applyTexture 设置 material.map 并递增 version（needsUpdate）', () => {
        const BakedModel = require('../src/Application/Utils/BakedModel').default;
        const mockModel = createMockModel();
        const mockTexture = createMockTexture();

        const baked = new BakedModel(mockModel, undefined, 900);
        const versionBefore = baked.material.version;
        baked.applyTexture(mockTexture);

        expect(baked.material.map).toBe(mockTexture);
        // THREE r137: needsUpdate 是 write-only setter，实际递增 version
        expect(baked.material.version).toBeGreaterThan(versionBefore);
        expect(baked.texture).toBe(mockTexture);
        expect(mockTexture.flipY).toBe(false);
    });

    test('有纹理构造时保持原有行为', () => {
        const BakedModel = require('../src/Application/Utils/BakedModel').default;
        const mockModel = createMockModel();
        const mockTexture = createMockTexture();

        const baked = new BakedModel(mockModel, mockTexture, 900);

        expect(baked.material.map).toBe(mockTexture);
        expect(mockTexture.flipY).toBe(false);
    });

    test('有纹理构造时 scale 被设置', () => {
        const BakedModel = require('../src/Application/Utils/BakedModel').default;
        const mockModel = createMockModel();
        const mockTexture = createMockTexture();

        new BakedModel(mockModel, mockTexture, 900);

        // traverse 应被调用，且 mesh 的 scale.set 被调用
        expect(mockModel.scene.traverse).toHaveBeenCalled();
    });

    test('无纹理构造时 scale 仍然被设置', () => {
        const BakedModel = require('../src/Application/Utils/BakedModel').default;
        const mockModel = createMockModel();

        new BakedModel(mockModel, undefined, 900);

        expect(mockModel.scene.traverse).toHaveBeenCalled();
    });
});
