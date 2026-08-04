import type { Group } from '@tweenjs/tween.js';
import { BakedModel } from './BakedModel';
import type { LoadedModel } from './types';

export class Computer extends BakedModel {
  constructor(model: LoadedModel, tweens: Group) {
    super(model, tweens, 900);
  }
}
