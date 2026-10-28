function shallowEqual(a: unknown, b: unknown) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.is(Reflect.get(a, key), Reflect.get(b, key)));
}
export function selectionSnapshot<State, Selection>(read: () => State, select: (state: State) => Selection) {
  let previous: Selection, initialized = false;
  return () => {
    const selected = select(read());
    if (!initialized || !shallowEqual(previous, selected)) { previous = selected; initialized = true; }
    return previous;
  };
}
