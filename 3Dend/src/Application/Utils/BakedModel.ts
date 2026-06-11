import * as THREE from 'three';

export default class BakedModel {
    model: LoadedModel;
    texture: LoadedTexture | undefined;
    material: THREE.MeshBasicMaterial;

    constructor(model: LoadedModel, texture?: LoadedTexture, scale?: number) {
        this.model = model;
        this.texture = texture;

        if (this.texture) {
            this.configureTexture(this.texture);

            this.material = new THREE.MeshBasicMaterial({
                map: this.texture,
            });
        } else {
            this.material = new THREE.MeshBasicMaterial({
                color: 0x333333,
            });
        }

        this.model.scene.traverse((child) => {
            if (child instanceof THREE.Mesh || (child as any).isMesh) {
                const mesh = child as THREE.Mesh;
                if (scale) mesh.scale.set(scale, scale, scale);
                mesh.material = this.material;
            }
        });

        return this;
    }

    applyTexture(texture: LoadedTexture): void {
        this.texture = texture;
        this.configureTexture(texture);

        this.material.map = texture;
        this.material.needsUpdate = true;
    }

    private configureTexture(texture: LoadedTexture): void {
        texture.flipY = false;
        texture.encoding = THREE.sRGBEncoding;
    }

    getModel(): THREE.Group {
        return this.model.scene;
    }
}
