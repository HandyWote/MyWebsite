import * as THREE from 'three';

const SMUDGE_OFFSET = 96;
const SHADOW_OFFSET = 20;

/**
 * TextureLayers —— 屏幕纹理层（污渍/阴影）的创建与淡入。
 *
 * 职责：在屏幕平面位置叠加带透明度/混合模式的纹理层，
 * 支持渐入动画。不关心 iframe 与滚动桥接。
 */
export default class TextureLayers {
    private scene: THREE.Scene;
    private screenSize: THREE.Vector2;
    private position: THREE.Vector3;
    private rotation: THREE.Euler;

    constructor(
        scene: THREE.Scene,
        screenSize: THREE.Vector2,
        position: THREE.Vector3,
        rotation: THREE.Euler
    ) {
        this.scene = scene;
        this.screenSize = screenSize;
        this.position = position;
        this.rotation = rotation;
    }

    /**
     * Adds a texture layer to the screen
     * @param texture the texture to add
     * @param blending the blending mode
     * @param opacity the opacity of the texture
     * @param offset the offset of the texture, higher values are further from the screen
     * @returns the created material
     */
    add(
        texture: THREE.Texture,
        blendingMode: THREE.Blending,
        opacity: number,
        offset: number
    ): THREE.MeshBasicMaterial {
        // Create material
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            blending: blendingMode,
            side: THREE.DoubleSide,
            opacity,
            transparent: true,
        });

        // Create geometry
        const geometry = new THREE.PlaneGeometry(
            this.screenSize.width,
            this.screenSize.height
        );

        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);

        // Copy position and apply the depth offset
        mesh.position.copy(
            this.offsetPosition(this.position, new THREE.Vector3(0, 0, offset))
        );

        // Copy rotation
        mesh.rotation.copy(this.rotation);

        this.scene.add(mesh);

        return material;
    }

    /**
     * Adds a texture layer with a fade-in animation
     */
    addWithFade(
        texture: THREE.Texture,
        blendingMode: THREE.Blending,
        targetOpacity: number,
        offset: number,
        duration = 500,
    ): void {
        const material = this.add(texture, blendingMode, 0, offset);
        this.fadeIn(material, targetOpacity, duration);
    }

    addSmudge(texture: THREE.Texture) {
        this.addWithFade(texture, THREE.AdditiveBlending, 0.12, SMUDGE_OFFSET);
    }

    addShadow(texture: THREE.Texture) {
        this.addWithFade(texture, THREE.NormalBlending, 1, SHADOW_OFFSET);
    }

    private fadeIn(
        material: THREE.MeshBasicMaterial,
        targetOpacity: number,
        duration: number,
    ): void {
        const startTime = performance.now();
        const fadeIn = () => {
            const progress = Math.min((performance.now() - startTime) / duration, 1);
            material.opacity = targetOpacity * progress;
            if (progress < 1) {
                requestAnimationFrame(fadeIn);
            }
        };
        requestAnimationFrame(fadeIn);
    }

    /**
     * Offsets a position vector by another vector
     */
    private offsetPosition(position: THREE.Vector3, offset: THREE.Vector3) {
        const newPosition = new THREE.Vector3();
        newPosition.copy(position);
        newPosition.add(offset);
        return newPosition;
    }
}
