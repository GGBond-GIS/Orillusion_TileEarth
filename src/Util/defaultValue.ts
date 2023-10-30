function defaultValue<T> (a: T, b: T): T {
    if (a !== undefined && a !== null) {
        return a;
    }
    return b;
}

defaultValue.EMPTY_OBJECT = Object.freeze({}) as {
    [name: string]: any
};

export { defaultValue };
