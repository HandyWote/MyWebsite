export default class Debug {
    active: boolean;
    ui: { destroy: () => void };

    constructor() {
        this.active = window.location.hash === '#debug';

        this.ui = { destroy: () => {} };
    }
}
