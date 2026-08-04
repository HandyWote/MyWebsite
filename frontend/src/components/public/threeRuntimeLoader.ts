import type { ThreeExperienceOptions } from '@/three/types';

export type ThreeRuntimeModule = {
  createThreeExperience(options: ThreeExperienceOptions): {
    start(): void;
    retryComputer(): void;
    destroy(): void;
  };
};

export async function loadThreeRuntime(): Promise<ThreeRuntimeModule> {
  return import('@/three/runtime');
}
