import { Application } from './Application';
import type { ThreeExperience, ThreeExperienceOptions } from './types';

let activeRuntime: Application | null = null;

export function createThreeExperience(options: ThreeExperienceOptions): ThreeExperience {
  activeRuntime?.destroy();
  const application = new Application(options);
  activeRuntime = application;

  return {
    start: () => application.start(),
    retryComputer: () => application.retryComputer(),
    destroy: () => {
      application.destroy();
      if (activeRuntime === application) activeRuntime = null;
    },
  };
}
