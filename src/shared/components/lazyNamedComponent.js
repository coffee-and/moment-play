import { lazy } from "react";

export function lazyNamedComponent(loadModule, exportName) {
  return lazy(async () => {
    const loadedModule = await loadModule();
    const Component = loadedModule[exportName];

    if (!Component) {
      throw new Error(`Lazy module does not export ${exportName}.`);
    }

    return { default: Component };
  });
}
