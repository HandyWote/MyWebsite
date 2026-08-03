import type Application from '../Application';
import type Camera from '../Camera/Camera';

/**
 * MonitorPointerTracker —— 鼠标进出电脑屏幕的状态机。
 *
 * 职责：监听 document 级 mouse 事件，维护 inComputer /
 * prevInComputer / shouldLeaveMonitor / mouseClickInProgress 状态，
 * 并触发 camera 的 enterMonitor / leftMonitor 事件。
 * 只发事件，不关心相机如何响应。
 */
export default class MonitorPointerTracker {
    application: Application;
    camera: Camera;
    prevInComputer: boolean;
    inComputer: boolean;
    shouldLeaveMonitor: boolean;
    mouseClickInProgress: boolean;

    constructor(application: Application, camera: Camera) {
        this.application = application;
        this.camera = camera;
        this.prevInComputer = false;
        this.inComputer = false;
        this.shouldLeaveMonitor = false;
        this.mouseClickInProgress = false;
    }

    initialize() {
        document.addEventListener(
            'mousemove',
            (event) => {
                // @ts-expect-error
                const id = event.target.id;
                if (id === 'computer-screen') {
                    // @ts-expect-error
                    event.inComputer = true;
                }

                // @ts-expect-error
                this.inComputer = event.inComputer;

                if (this.inComputer && !this.prevInComputer) {
                    this.camera.trigger('enterMonitor');
                }

                if (
                    !this.inComputer &&
                    this.prevInComputer &&
                    !this.mouseClickInProgress
                ) {
                    this.camera.trigger('leftMonitor');
                }

                if (
                    !this.inComputer &&
                    this.mouseClickInProgress &&
                    this.prevInComputer
                ) {
                    this.shouldLeaveMonitor = true;
                } else {
                    this.shouldLeaveMonitor = false;
                }

                this.application.mouse.trigger('mousemove', [event]);

                this.prevInComputer = this.inComputer;
            },
            false
        );
        document.addEventListener(
            'mousedown',
            (event) => {
                // @ts-expect-error
                this.inComputer = event.inComputer;
                this.application.mouse.trigger('mousedown', [event]);

                this.mouseClickInProgress = true;
                this.prevInComputer = this.inComputer;
            },
            false
        );
        document.addEventListener(
            'mouseup',
            (event) => {
                // @ts-expect-error
                this.inComputer = event.inComputer;
                this.application.mouse.trigger('mouseup', [event]);

                if (this.shouldLeaveMonitor) {
                    this.camera.trigger('leftMonitor');
                    this.shouldLeaveMonitor = false;
                }

                this.mouseClickInProgress = false;
                this.prevInComputer = this.inComputer;
            },
            false
        );
    }
}
