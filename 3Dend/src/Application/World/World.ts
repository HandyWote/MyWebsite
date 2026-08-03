import Application from '../Application';
import type Resources from '../Utils/Resources';
import ComputerSetup from './Computer';
import MonitorScreen from './MonitorScreen';
import Environment from './Environment';
import Decor from './Decor';

export default class World {
    application: Application;
    scene: THREE.Scene;
    resources: Resources;

    // Objects in the scene
    environment: Environment;
    decor: Decor;
    computerSetup: ComputerSetup;
    monitorScreen: MonitorScreen;

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.resources = this.application.resources;

        // 阶段1：几何就绪 → 创建场景（无纹理占位）
        this.resources.on('geometryReady', () => {
            this.environment = new Environment();
            this.decor = new Decor();
            this.computerSetup = new ComputerSetup();
            this.monitorScreen = new MonitorScreen();
        });

        // 阶段2：纹理逐个就绪 → 无感贴图
        this.resources.on('textureLoaded', (sourceName: string, texture: LoadedTexture) => {
            if (!this.computerSetup) return; // 场景尚未创建

            switch (sourceName) {
                case 'computerSetupTexture':
                    this.computerSetup.bakedModel.applyTexture(texture);
                    break;
                case 'environmentTexture':
                    this.environment.bakedModel.applyTexture(texture);
                    break;
                case 'decorTexture':
                    this.decor.bakedModel.applyTexture(texture);
                    break;
                case 'monitorSmudgeTexture':
                    this.monitorScreen.addSmudgeLayer(texture);
                    break;
                case 'monitorShadowTexture':
                    this.monitorScreen.addShadowLayer(texture);
                    break;
            }
        });
    }

    update() {
        if (this.monitorScreen) this.monitorScreen.update();
        if (this.environment) this.environment.update();
    }
}
