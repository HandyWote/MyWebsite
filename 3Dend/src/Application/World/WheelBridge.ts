/**
 * WheelBridge —— iframe 内滚轮桥接算法。
 *
 * 职责：把 iframe 内页面的 wheel 事件桥接到其可滚动元素，
 * 解决外层 3D 场景与内嵌页面滚动冲突的问题。
 * 纯算法 + iframe document 访问，不依赖 three 场景。
 */
export default class WheelBridge {
    private iframe: HTMLIFrameElement | null = null;
    private cleanup: (() => void) | null = null;
    private cachedIframeScrollTarget: HTMLElement | null = null;

    attach(iframe: HTMLIFrameElement) {
        this.detach();
        this.iframe = iframe;

        const doc = this.getIframeDocument();
        if (!doc) return;
        this.cachedIframeScrollTarget = null;

        const handleWheel = (event: WheelEvent) => {
            const { deltaX, deltaY } = this.getWheelDelta(event);
            if (deltaX === 0 && deltaY === 0) return;

            const target = this.findScrollTarget(event, doc);
            if (!target) return;

            event.preventDefault();
            target.scrollBy({ top: deltaY, left: deltaX, behavior: 'auto' });
        };

        doc.addEventListener('wheel', handleWheel, { passive: false });
        this.cleanup = () => {
            doc.removeEventListener('wheel', handleWheel);
        };
    }

    detach() {
        this.cleanup?.();
        this.cleanup = null;
    }

    private getWheelDelta(event: WheelEvent) {
        let { deltaX, deltaY } = event;

        if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
            deltaX *= 40;
            deltaY *= 40;
        } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
            // DOM_DELTA_PAGE is extremely rare; approximate with 800px
            deltaX *= 800;
            deltaY *= 800;
        }

        return { deltaX, deltaY };
    }

    private findScrollTarget(event: WheelEvent, doc: Document): HTMLElement | null {
        let element = this.getEventElement(event, doc);

        while (element && element !== doc.documentElement) {
            if (this.isScrollableElement(element, doc)) {
                this.cachedIframeScrollTarget = element;
                return element;
            }

            element = element.parentElement;
        }

        if (this.isCachedScrollTargetValid(doc)) {
            return this.cachedIframeScrollTarget;
        }

        return this.findFallbackScrollTarget(doc);
    }

    private findFallbackScrollTarget(doc: Document): HTMLElement | null {
        const main = doc.querySelector('main');
        const candidates = [
            ...(main ? [main] : []),
            ...Array.from(doc.body?.querySelectorAll('*') || []),
        ];

        for (const candidate of candidates) {
            if (this.isHTMLElement(candidate, doc) && this.isScrollableElement(candidate, doc)) {
                this.cachedIframeScrollTarget = candidate;
                return candidate;
            }
        }

        const root = doc.scrollingElement || doc.documentElement;
        if (this.isHTMLElement(root, doc) && this.isScrollableElement(root, doc)) {
            this.cachedIframeScrollTarget = root;
            return root;
        }

        this.cachedIframeScrollTarget = null;
        return null;
    }

    private isScrollableElement(element: HTMLElement, doc: Document): boolean {
        const style = doc.defaultView?.getComputedStyle(element);
        const canScrollY =
            style &&
            /(auto|scroll)/.test(style.overflowY) &&
            element.scrollHeight > element.clientHeight;
        const canScrollX =
            style &&
            /(auto|scroll)/.test(style.overflowX) &&
            element.scrollWidth > element.clientWidth;

        return Boolean(canScrollY || canScrollX);
    }

    private isCachedScrollTargetValid(doc: Document): boolean {
        return Boolean(
            this.cachedIframeScrollTarget?.isConnected &&
            this.isScrollableElement(this.cachedIframeScrollTarget, doc)
        );
    }

    private getEventElement(event: WheelEvent, doc: Document): HTMLElement | null {
        const target = event.target;
        return this.isHTMLElement(target, doc) ? target : null;
    }

    private isHTMLElement(value: unknown, doc: Document): value is HTMLElement {
        const HTMLElementCtor = doc.defaultView?.HTMLElement;
        return Boolean(HTMLElementCtor && value instanceof HTMLElementCtor);
    }

    private getIframeDocument(): Document | null {
        try {
            return this.iframe?.contentDocument || null;
        } catch {
            return null;
        }
    }
}
