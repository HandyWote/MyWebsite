type Resource = TextureResource | CubeTextureResource | ModelResource;

declare interface StyleSheetCSS {
    [key: string]: React.CSSProperties;
}

type TextureResource = {
    name: string;
    type: 'texture';
    path: string;
    group: 'geometry' | 'texture';
};

type CubeTextureResource = {
    name: string;
    type: 'cubeTexture';
    path: string[];
    group?: 'geometry' | 'texture';
};

type ModelResource = {
    name: string;
    type: 'gltfModel';
    path: string;
    group: 'geometry' | 'texture';
};

type EnclosingPlane = {
    size: THREE.Vector2;
    position: THREE.Vector3;
    rotation: THREE.Euler;
};

type CameraKeyframe = {
    position: THREE.Vector3;
    focalPoint: THREE.Vector3;
};

type LoadedResource = LoadedTexture | LoadedCubeTexture | LoadedModel;

type LoadedTexture = THREE.Texture;

type LoadedModel = import('three/examples/jsm/loaders/GLTFLoader').GLTF;

type LoadedCubeTexture = THREE.CubeTexture;

type ResourceType = 'texture' | 'cubeTexture' | 'gltfModel';
