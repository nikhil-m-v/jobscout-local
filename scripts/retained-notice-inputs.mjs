import { isDeepStrictEqual } from 'node:util';

// Reusing an exact engine's notices must not silently accept dependency changes.
export function assertRetainedNoticeInputs(retainedNpm, currentNpm, retainedCargo, currentCargo) {
  for (const item of [retainedNpm, currentNpm]) {
    if (!item?.dependencies || !Object.keys(item.dependencies).length) throw new Error('Missing npm dependency evidence.');
  }
  for (const item of [retainedCargo, currentCargo]) {
    if (!item?.packages?.length || !item.resolve?.nodes?.length) throw new Error('Missing Cargo dependency evidence.');
  }
  if (!isDeepStrictEqual(retainedNpm.dependencies, currentNpm.dependencies) ||
      !isDeepStrictEqual(retainedCargo.packages, currentCargo.packages) ||
      !isDeepStrictEqual(retainedCargo.resolve, currentCargo.resolve)) {
    throw new Error('Retained notice dependency inputs changed; generate a fresh paired engine and notices.');
  }
}
